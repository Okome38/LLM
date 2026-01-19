// js/rag-system.js
class RAGSystem {
    constructor() {
        this.searchEngine = new VectorSearchEngine();
        this.llm = new EducationLLMClient(API_CONFIG.studentId);
    }
    
    async initialize(documents) {
        console.log('RAGシステム初期化中...');
        for (const doc of documents) {
            await this.searchEngine.addDocument(
                doc.content, 
                doc
            );
        }
        console.log(`${documents.length}件の文書を登録完了！`);
    }

    async query(question, options = {}) {
        const relevantDocs = await this.searchEngine.search(
            question, 
            options.retrieveCount || 3
        );
        
        if (relevantDocs.length === 0) {
            return await this.llm.chat(question);
        }
        
        const context = this.buildContext(relevantDocs);
        const prompt = this.buildPrompt(question, context);
        const response = await this.llm.chat(prompt);
        
        return { ...response, sources: relevantDocs };
    }

    buildContext(relevantDocs) {
        return relevantDocs
            .map((doc, index) => 
                `[文書${index + 1}] ${doc.document.text}`
            )
            .join('\n\n');
    }

    buildPrompt(question, context) {
        return `以下の文書を参考にして、質問に答えてください。

参考文書:
${context}

質問: ${question}

回答:`;
    }

    // ★ displayRAGResult メソッドを追加
    displayRAGResult(result) {
    const container = document.getElementById('rag-result');
    
    // ========================================
    // 1. 類似度に応じた色を決定する関数
    // ========================================
    function getSimilarityColor(similarity) {
        if (similarity > 0.8) return '#4CAF50';  // 緑（高関連）
        if (similarity > 0.5) return '#FF9800';  // オレンジ（中関連）
        return '#9E9E9E';                        // グレー（低関連）
    }
    
    function getBackgroundColor(similarity) {
        if (similarity > 0.8) return '#E8F5E9';  // 薄い緑
        if (similarity > 0.5) return '#FFF3E0';  // 薄いオレンジ
        return '#F5F5F5';                        // 薄いグレー
    }
    
    // ========================================
    // 2. メタデータ用のアイコン定義
    // ========================================
    const levelIcons = {
        'beginner': '🌱',
        'intermediate': '🌿',
        'advanced': '🌳',
        'expert': '🏆'
    };
    
    const subjectIcons = {
        'programming': '💻',
        'algorithms': '🧮',
        'ai': '🤖',
        'database': '🗄️',
        'network': '🌐',
        'electromagnetism': '⚡'
    };
    
    // ========================================
    // 3. キーワードハイライト関数
    // ========================================
    function highlightKeywords(text, query) {
        if (!query || !text) return text;
        
        // 検索クエリを単語に分割（スペース区切り）
        const keywords = query.split(/\s+/).filter(k => k.length > 0);
        
        let highlightedText = text;
        keywords.forEach(keyword => {
            // 大文字小文字を区別しない正規表現
            const regex = new RegExp(`(${keyword})`, 'gi');
            highlightedText = highlightedText.replace(
                regex, 
                '<mark style="background: #FFEB3B; padding: 2px 4px; border-radius: 2px;">$1</mark>'
            );
        });
        
        return highlightedText;
    }
    
    // ========================================
    // 4. 類似度バッジの生成
    // ========================================
    function getSimilarityBadge(similarity) {
        const color = getSimilarityColor(similarity);
        const label = similarity > 0.8 ? '高関連' : 
                     similarity > 0.5 ? '中関連' : '低関連';
        
        return `
            <span style="
                display: inline-block;
                padding: 4px 8px;
                background: ${color};
                color: white;
                border-radius: 12px;
                font-size: 11px;
                font-weight: bold;
                margin-left: 8px;
            ">
                ${label} ${(similarity * 100).toFixed(0)}%
            </span>
        `;
    }
    
    // ========================================
    // 5. HTML生成
    // ========================================
    
    // 検索クエリを取得（後でハイライトに使用）
    const searchQuery = document.getElementById('question')?.value || '';
    
    container.innerHTML = `
        <div style="margin: 20px 0;">
            <!-- AI回答部分 -->
            <div style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 10px;
                margin-bottom: 20px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            ">
                <h3 style="margin: 0 0 10px 0; display: flex; align-items: center;">
                    🤖 AI回答
                </h3>
                <p style="
                    margin: 0;
                    line-height: 1.6;
                    font-size: 16px;
                ">
                    ${result.response}
                </p>
            </div>
            
            <!-- 参考文書セクション -->
            <h4 style="
                color: #2c3e50;
                margin: 20px 0 15px 0;
                font-size: 18px;
                display: flex;
                align-items: center;
            ">
                📚 参考文書 (${result.sources ? result.sources.length : 0}件)
            </h4>
            
            ${result.sources ? result.sources.map((source, index) => {
                const borderColor = getSimilarityColor(source.similarity);
                const bgColor = getBackgroundColor(source.similarity);
                
                // メタデータの取得
                const metadata = source.document.metadata || {};
                const levelIcon = levelIcons[metadata.level] || '📄';
                const subjectIcon = subjectIcons[metadata.subject] || '📚';
                
                // タイトルと本文にハイライトを適用
                const highlightedTitle = highlightKeywords(metadata.title || `文書 ${index + 1}`, searchQuery);
                const highlightedText = highlightKeywords(source.document.text.substring(0, 150), searchQuery);
                
                return `
                    <div style="
                        margin: 15px 0;
                        padding: 15px;
                        background: ${bgColor};
                        border-left: 5px solid ${borderColor};
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        transition: transform 0.2s, box-shadow 0.2s;
                    " onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';" 
                       onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';">
                        
                        <!-- ヘッダー部分 -->
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            margin-bottom: 10px;
                        ">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 20px;">${levelIcon} ${subjectIcon}</span>
                                <strong style="
                                    color: #2c3e50;
                                    font-size: 16px;
                                ">${highlightedTitle}</strong>
                            </div>
                            ${getSimilarityBadge(source.similarity)}
                        </div>
                        
                        <!-- 本文プレビュー -->
                        <div style="
                            color: #555;
                            line-height: 1.6;
                            margin: 10px 0;
                            font-size: 14px;
                        ">
                            ${highlightedText}...
                        </div>
                        
                        <!-- メタデータ表示 -->
                        <div style="
                            display: flex;
                            gap: 15px;
                            margin-top: 10px;
                            padding-top: 10px;
                            border-top: 1px solid rgba(0,0,0,0.1);
                            font-size: 12px;
                            color: #666;
                        ">
                            ${metadata.subject ? `
                                <span style="display: flex; align-items: center; gap: 4px;">
                                    📂 <strong>分野:</strong> ${metadata.subject}
                                </span>
                            ` : ''}
                            
                            ${metadata.level ? `
                                <span style="display: flex; align-items: center; gap: 4px;">
                                    ${levelIcon} <strong>レベル:</strong> ${metadata.level}
                                </span>
                            ` : ''}
                            
                            ${metadata.estimatedReadingTime ? `
                                <span style="display: flex; align-items: center; gap: 4px;">
                                    ⏱️ <strong>読了時間:</strong> 約${metadata.estimatedReadingTime}分
                                </span>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('') : '<p style="color: #999;">参考文書はありません</p>'}
        </div>
    `;
}
}