# [TIL] OpenAI Chat Completions API를 활용한 지능형 챗봇 구현
## 1. API 통신 방식의 이해: REST API vs SDK
* REST API 방식: 라이브러리 없이 requests를 통해 직접 HTTP POST 요청을 보냅니다. 헤더(Authorization)에 API 키를 담고, payload에 모델명과 메시지를 JSON 형식으로 전달하여 AI의 응답을 받아옵니다.

* OpenAI SDK 방식: pip install openai를 통해 공식 라이브러리를 사용합니다. 객체 지향적인 인터페이스(client.chat.completions.create)를 제공하여 코드의 가독성이 높고 관리가 효율적입니다.

* 환경 변수 관리: 보안을 위해 API 키는 코드에 직접 노출하지 않고 .env 파일에 저장한 후 python-dotenv 라이브러리를 통해 호출하여 사용합니다.

## 2. LLM 성능 제어: System Prompt 및 Hyperparameter
* 동일한 질문이라도 설정값에 따라 AI의 출력 특성이 크게 달라집니다.

* System Prompt (페르소나): AI에게 '심리 상담사', '셰프', '헬스 트레이너' 등의 역할을 부여하여 답변의 톤앤매너와 전문 분야 비유 방식을 결정합니다.

* Temperature (창의성): 모델의 무작위성을 조절합니다.

* 낮은 값(0.3): 일관되고 결정론적인 답변을 생성합니다. (예: 정보 전달, 사실 확인)

* 높은 값(1.5 이상): 창의적이고 예상치 못한 답변을 생성하지만, 값이 너무 높으면 문맥이 깨지거나 외계어와 같은 환각(Hallucination) 현상이 발생합니다.

* Logprobs: 각 토큰이 선택될 확률을 확인하여 모델이 답변을 생성할 때 얼마나 확신을 가졌는지 수치적으로 분석할 수 있습니다.

## 3. 상태 유지(Stateless) 극복: Context Window 구현
* Chat API는 기본적으로 이전 대화를 기억하지 못하는 Stateless 방식입니다.

* 메모리 구현 원리: 대화 내역을 리스트(history)에 누적 저장하고, 매 요청 시 이 전체 리스트를 API에 다시 전송해야 합니다.

* 역할 구분: system(지침), user(사용자 질문), assistant(AI 답변) 역할을 명확히 구분하여 리스트에 append 함으로써 대화의 맥락을 유지합니다.

## 4. 실전 미니 프로젝트: CLI 및 Web 챗봇 구현
* A. CLI 스트리밍 챗봇 (chatbot.py)
Streaming 처리: stream=True 설정을 통해 답변이 완성될 때까지 기다리지 않고, 조각(Chunk) 단위로 실시간 출력하여 사용자 경험을 개선합니다.

* Flush 옵션: print(content, flush=True)를 사용하여 출력 버퍼를 즉시 비워 텍스트가 끊김 없이 화면에 뿌려지도록 처리합니다.

* B. Streamlit 기반 Web UI 챗봇 (streamlit_chatbot.py)
세션 상태(st.session_state): 웹 페이지가 리렌더링되어도 대화 내역이 초기화되지 않도록 Streamlit의 세션 저장소를 활용합니다.

* UI 컴포넌트: st.chat_message와 st.chat_input을 사용하여 카카오톡이나 ChatGPT와 유사한 대화형 인터페이스를 빠르게 구축합니다.

* 동적 설정: 사이드바를 통해 시스템 프롬프트를 실시간으로 변경하거나 대화 내역을 초기화하는 기능을 추가하여 편의성을 높였습니다.

## 5. 핵심 코드 요약: 스트리밍 대화 루프
```python

# 스트리밍 응답을 받아서 실시간 출력 및 메모리 저장
response_stream = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=history,
    stream=True
)

full_answer = ""
for chunk in response_stream:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)
        full_answer += content

# 대화 맥락 유지를 위해 최종 답변 저장
history.append({"role": "assistant", "content": full_answer})
```
## 6. 학습 포인트 (Troubleshooting)
* JSON 모드 활용: 웹 서비스 백엔드에서 데이터를 처리할 때는 response_format={"type": "json_object"}를 설정하여 답변 형식을 고정해야 파싱 에러를 방지할 수 있습니다.

* 비동기 처리(AsyncOpenAI): 여러 도시의 맛집 추천과 같이 다수의 API 호출이 필요한 경우, asyncio.gather를 통해 병렬로 요청을 보내 대기 시간을 획기적으로 단축할 수 있습니다.

* 토큰 관리: Temperature가 너무 높으면 모델이 비정상적인 토큰을 생성하며 길어질 수 있으므로 max_completion_tokens를 설정하여 비용과 응답 길이를 제한하는 것이 안전합니다.