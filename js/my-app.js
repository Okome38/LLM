// js/my-app.js - メインアプリケーション

class MyLearningApp {
  constructor() {
    this.rag = null;
    this.ontology = null;
    this.factChecker = null;
    this.currentAnswer = null;
    this.currentQuestion = null;
  }

  async initialize() {
    try {
      console.log("[1/6] 🚀 システム初期化中...");

      const [docsRes, ontoRes] = await Promise.all([
        fetch("../data/vocal_technique_documents.json"),
        fetch("../data/vocal_technique_ontology.json"),
      ]);
      console.log("[2/6] 🚚 ファイルのフェッチ完了");

      const docs = await docsRes.json();
      const onto = await ontoRes.json();
      console.log("[3/6] 📄 JSONのパース完了");

      this.rag = new SemanticRAGSystem();
      await this.rag.initialize(docs.documents, onto);
      console.log("[4/6] 🧠 RAGシステムの初期化完了");

      this.ontology = new LearningOntology();
      await this.ontology.loadOntology(onto);
      console.log("[5/6] 🕸️ オントロジーの読み込み完了");

      this.factChecker = new FactChecker();
      console.log("[6/6] ✨ 全コンポーネント準備完了");

    } catch (error) {
      console.error("❌ 初期化プロセス中に致命的なエラーが発生しました:", error);
      const container = document.getElementById('result-container');
      if (container) {
          container.innerHTML = `<div class="answer-box" style="border-left-color: #d9534f;"><h3>❌ 初期化エラー</h3><p>アプリケーションの初期化に失敗しました。詳細を開発者コンソールで確認してください。</p><pre style="white-space: pre-wrap; margin-top: 10px; background: #f1f1f1; padding: 10px; border-radius: 5px;">${error.stack}</pre></div>`;
      }
      throw error;
    }
  }

  // 質問処理
  async handleQuestion(question) {
    this.currentQuestion = question;

    // RAGで回答生成
    const result = await this.rag.semanticQuery(question);
    this.currentAnswer = result.answer;

    // 適応的支援を追加（ここをカスタマイズ）
    const adaptiveSupport = await this.generateAdaptiveSupport(
      question,
      result
    );

    return {
      answer: result.answer,
      sources: result.sources,
      adaptiveSupport: adaptiveSupport,
    };
  }

  // 適応的支援の生成（カスタマイズポイント）
  async generateAdaptiveSupport(question, ragResult) {
    const support = {};

    // 1. 前提知識チェック
    const concepts = ragResult.expandedQuery?.concepts || [];
    if (concepts.length > 0) {
      const prerequisites = [];
      for (const concept of concepts) {
        const prereqs = this.ontology.getPrerequisiteChain(concept);
        prerequisites.push(...prereqs);
      }
      if (prerequisites.length > 0) {
        support.prerequisites = {
          message:
            "💡 この内容を理解するには、以下の前提知識があると良いです：",
          items: [...new Set(prerequisites)],
        };
      }
    }

    // 2. 関連概念の提示
    if (concepts.length > 0) {
      const related = [];
      for (const concept of concepts) {
        const relatedConcepts = this.ontology.findRelatedConcepts(concept, 1);
        related.push(...relatedConcepts);
      }
      if (related.length > 0) {
        support.relatedConcepts = {
          message: "🔗 関連するトピック：",
          items: [...new Set(related)],
        };
      }
    }

    // 3. 次のステップ
    if (concepts.length > 0) {
      const nextSteps = [];
      for (const concept of concepts) {
        const conceptData = this.ontology.getConcept(concept);
        if (conceptData?.nextSteps) {
          nextSteps.push(...conceptData.nextSteps);
        }
      }
      if (nextSteps.length > 0) {
        support.nextSteps = {
          message: "📈 次に学ぶと良いこと：",
          items: [...new Set(nextSteps)],
        };
      }
    }

    return support;
  }

  // 結果表示
  displayResult(result, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
            <div class="result-section">
                <div class="answer-box">
                    <h3>🤖 回答</h3>
                    <p>${result.answer.replace(/\n/g, "<br>")}</p>
                </div>
        `;

    // 適応的支援の表示
    if (result.adaptiveSupport) {
      const support = result.adaptiveSupport;

      if (support.prerequisites) {
        html += `
                    <div class="support-box prerequisites">
                        <p>${support.prerequisites.message}</p>
                        <ul>
                            ${support.prerequisites.items
                              .map((item) => `<li>${item}</li>`)
                              .join("")}
                        </ul>
                    </div>
                `;
      }

      if (support.relatedConcepts) {
        html += `
                    <div class="support-box related">
                        <p>${support.relatedConcepts.message}</p>
                        <div class="concept-tags">
                            ${support.relatedConcepts.items
                              .map((item) => `<span class="tag">${item}</span>`)
                              .join("")}
                        </div>
                    </div>
                `;
      }

      if (support.nextSteps) {
        html += `
                    <div class="support-box next-steps">
                        <p>${support.nextSteps.message}</p>
                        <ul>
                            ${support.nextSteps.items
                              .map((item) => `<li>${item}</li>`)
                              .join("")}
                        </ul>
                    </div>
                `;
      }
    }

    // 検証ボタン
    html += `
                <div id="verification-area"></div>
            </div>
        `;

    container.innerHTML = html;

    // 検証UIを追加
    this.factChecker.generateVerificationUI("verification-area");
  }
}

// グローバル変数
let app;
let currentQuestion;
let currentAnswer;

// 初期化
document.addEventListener("DOMContentLoaded", async () => {
  app = new MyLearningApp();
  await app.initialize();
  document.getElementById("ask-btn").disabled = false;
  document.getElementById("question-input").disabled = false;
});

// 質問送信
async function askQuestion() {
  const input = document.getElementById("question-input");
  const question = input.value.trim();
  if (!question) return;

  if (!app || !app.rag) {
    alert("エラー: アプリケーションがまだ初期化されていません。ページの読み込みが完了するまで待つか、ページを再読み込みしてください。");
    return;
  }

  currentQuestion = question;
  document.getElementById("ask-btn").disabled = true;

  try {
    const result = await app.handleQuestion(question);
    currentAnswer = result.answer;
    app.displayResult(result, "result-container");
  } catch (error) {
    console.error("エラー:", error);
    alert("エラーが発生しました: " + error.message);
  } finally {
    document.getElementById("ask-btn").disabled = false;
  }
}

// 検証実行
async function verifyInfo(type) {
  if (!currentQuestion || !currentAnswer) return;

  const btn = event.target;
  btn.disabled = true;
  btn.textContent = "検証中...";

  try {
    let results;
    switch (type) {
      case "academic":
        results = await app.factChecker.verifyWithAcademic(currentQuestion);
        break;
      case "books":
        results = await app.factChecker.verifyWithBooks(currentQuestion);
        break;
      case "web":
        results = await app.factChecker.verifyWithWeb(currentQuestion);
        break;
    }

    const evaluation = await app.factChecker.evaluateWithSources(
      currentQuestion,
      currentAnswer,
      results
    );

    app.factChecker.displayVerificationResults(results, evaluation);
  } catch (error) {
    console.error("検証エラー:", error);
    alert("検証に失敗しました: " + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = btn.textContent.replace("検証中...", "");
  }
}