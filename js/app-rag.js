let ragSystem;

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // RAGSystemクラスの確認
        if (typeof RAGSystem === 'undefined') {
            console.error('❌ RAGSystemクラスが見つかりません。js/rag-system.jsが正しく読み込まれているか確認してください。');
            return;
        }
        
        ragSystem = new RAGSystem();
        
        // 既存のサンプル文書を読み込み
        const response = await fetch('data/sample-documents.json');
        if (!response.ok) {
            throw new Error('sample-documents.jsonの読み込みに失敗しました');
        }
        
        const data = await response.json();
        
        await ragSystem.initialize(data.documents);
        console.log('✅ RAGシステム準備完了！');
        
    } catch (error) {
        console.error('❌ RAGシステムの初期化に失敗:', error);
        alert('システムの初期化に失敗しました。コンソールを確認してください。');
    }
});

// 質問処理
async function askRAG() {
    try {
        if (!ragSystem) {
            alert('RAGシステムがまだ初期化されていません。少々お待ちください。');
            return;
        }
        
        const question = document.getElementById('question').value;
        
        if (!question.trim()) {
            alert('質問を入力してください');
            return;
        }
        
        // ローディング表示
        const resultContainer = document.getElementById('rag-result');
        resultContainer.innerHTML = '<p style="color: #666;">回答を生成中...</p>';
        
        const result = await ragSystem.query(question);
        ragSystem.displayRAGResult(result);
        
    } catch (error) {
        console.error('❌ 質問処理エラー:', error);
        document.getElementById('rag-result').innerHTML = 
            `<p style="color: red;">エラーが発生しました: ${error.message}</p>`;
    }
}
