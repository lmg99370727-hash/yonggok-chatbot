// api/chat.js (Vercel Serverless Function Example)
// 이 코드는 Vercel과 같은 서버리스 환경에 배포하기 위한 백엔드 예시입니다.

export default async function handler(req, res) {
  // CORS 처리 (필요에 따라 도메인 제한 가능)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // --- 중요: 환경 변수에 GEMINI_API_KEY를 설정해야 합니다 ---
  const API_KEY = process.env.GEMINI_API_KEY; 
  if (!API_KEY) {
      return res.status(500).json({ error: 'API Key is missing on the server.' });
  }

  const systemPrompt = `
# 역할 및 목적
당신은 천안용곡초등학교 6학년 학부모들의 질문에 답하는 '천안시 중학교 신입생 배정 안내 챗봇'입니다. 당신의 목표는 학부모들의 반복적인 질문에 신속하고 정확하게 답변하여 불안감을 해소하고, 담임 교사의 업무 부담을 줄이는 것입니다. 

# 절대 준수 규칙 (Guardrails)
1. 사전 정의된 [2027학년도 천안시 중학교 입학배정업무 계획(최종)] 데이터만을 바탕으로 답변하십시오. (※ 지침 내용은 모델 지식 및 제공된 PDF 정보 기반)
2. 지침에 명시되지 않은 내용, 개인별 특수한 상황(예: 특정 번지수의 정확한 학군 배정 여부, 개인적인 이사 일정 등), 또는 불확실한 내용에 대해서는 절대 임의로 유추하거나 지어내지 마십시오.
3. 위 2번과 같은 예외 상황이나 모르는 질문이 들어오면 반드시 다음과 같이 답변하십시오: "알 수 없습니다. 해당 내용은 교육지원청 지침에 따라 사례별로 다를 수 있으므로, 정확한 확인을 위해 담임 선생님께 문의해 주세요."
4. 민감한 개인정보(이름, 주소, 연락처 등)를 요구하거나 수집하지 마십시오.
5. 모든 답변의 마지막에는 다음 안내 문구를 작게(또는 참고 형태로) 덧붙이십시오: "※ 본 안내는 참고용이며, 최종적이고 정확한 배정 규정은 관할 교육지원청의 공식 지침을 반드시 확인하시기 바랍니다." 

# 어조 및 형식 (Tone & Format)
- 학부모를 대하듯 정중하고 친절하며 전문적인 평어체를 사용하십시오 (~습니다, ~합니다).
- 가독성을 높이기 위해 적절한 줄바꿈과 글머리 기호(-, *)를 사용하십시오.
- 불필요한 서론을 길게 늘어놓지 말고, 질문에 대한 핵심적인 답변을 먼저 제시하는 두괄식으로 작성하십시오.
`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
            { role: "user", parts: [{ text: systemPrompt + "\n\n학부모 질문: " + userMessage }]}
        ],
        generationConfig: {
            temperature: 0.2, // 답변의 일관성을 높이기 위해 낮게 설정
        }
      })
    });

    const data = await response.json();
    
    let botReply = "죄송합니다. 답변을 생성하지 못했습니다.";
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
        botReply = data.candidates[0].content.parts[0].text;
    }

    return res.status(200).json({ reply: botReply });

  } catch (error) {
    console.error("Gemini API Request Error:", error);
    return res.status(500).json({ error: 'Failed to communicate with AI service' });
  }
}
