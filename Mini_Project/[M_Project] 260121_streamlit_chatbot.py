import streamlit as st
import os
from dotenv import load_dotenv
from openai import OpenAI

# 환경 변수 로드
load_dotenv()
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
model = "gpt-4o-mini"

# OpenAI 클라이언트 초기화
client = OpenAI(api_key=OPENAI_API_KEY)

# 페이지 설정
st.set_page_config(
    page_title="AI 챗봇",
    page_icon="🤖",
    layout="centered"
)

# 제목
st.title("🤖 GPT-4o Mini 챗봇")
st.caption("OpenAI GPT-4o Mini와 대화해보세요!")

# 세션 상태 초기화
if "messages" not in st.session_state:
    st.session_state.messages = []

# 기존 대화 내역 표시
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# OpenAI API를 사용한 응답 생성 함수
def generate_response(messages):
    """OpenAI API를 사용하여 응답 생성"""
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=1000,
            stream=True  # 스트리밍 활성화
        )
        return response
    except Exception as e:
        return None

# 사용자 입력 받기
if prompt := st.chat_input("메시지를 입력하세요..."):
    # 사용자 메시지 표시
    with st.chat_message("user"):
        st.markdown(prompt)
    
    # 사용자 메시지를 세션에 추가
    st.session_state.messages.append({"role": "user", "content": prompt})
    
    # 봇 응답 생성 및 표시
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        full_response = ""
        
        # OpenAI API 호출
        response_stream = generate_response(st.session_state.messages)
        
        if response_stream:
            # 스트리밍 응답 처리
            for chunk in response_stream:
                if chunk.choices[0].delta.content is not None:
                    full_response += chunk.choices[0].delta.content
                    message_placeholder.markdown(full_response + "▌")
            
            message_placeholder.markdown(full_response)
        else:
            full_response = "죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. API 키를 확인해주세요."
            message_placeholder.markdown(full_response)
    
    # 봇 메시지를 세션에 추가
    st.session_state.messages.append({"role": "assistant", "content": full_response})

# 사이드바에 추가 정보
with st.sidebar:
    st.header("ℹ️ 정보")
    st.write("이 챗봇은 OpenAI GPT-4o Mini를 사용합니다.")
    
    st.header("⚙️ 설정")
    
    # API 키 상태 확인
    if OPENAI_API_KEY:
        st.success("✅ API 키가 설정되었습니다.")
    else:
        st.error("❌ API 키가 설정되지 않았습니다.")
        st.info("`.env` 파일에 OPENAI_API_KEY를 추가해주세요.")
    
    st.write(f"**모델:** {model}")
    
    st.header("📊 통계")
    st.write(f"대화 메시지 수: {len(st.session_state.messages)}")
    
    # 대화 초기화 버튼
    if st.button("🗑️ 대화 초기화"):
        st.session_state.messages = []
        st.rerun()
    
    st.markdown("---")
    
    # 시스템 프롬프트 설정 (선택사항)
    with st.expander("🎨 시스템 프롬프트 설정"):
        system_prompt = st.text_area(
            "시스템 프롬프트",
            value="당신은 친절하고 도움이 되는 AI 어시스턴트입니다.",
            help="챗봇의 성격과 역할을 정의합니다."
        )
        
        if st.button("적용"):
            # 시스템 메시지가 없으면 추가
            if not st.session_state.messages or st.session_state.messages[0]["role"] != "system":
                st.session_state.messages.insert(0, {"role": "system", "content": system_prompt})
            else:
                st.session_state.messages[0]["content"] = system_prompt
            st.success("시스템 프롬프트가 적용되었습니다!")
            st.rerun()
    
    st.caption("💡 Powered by OpenAI GPT-4o Mini")

# 명령어는 streamlit run streamlit_chatbot.py