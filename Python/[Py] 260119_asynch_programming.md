# [TIL] 파이썬 비동기 프로그래밍 (Asynchronous Programming)
### 1. 비동기 프로그래밍 개요
- 정의: 단일 스레드 환경에서 여러 작업을 동시에 처리하기 위한 제어 방식입니다.
- 핵심 목적: 입출력(I/O) 작업 대기 시간 동안 자원의 유휴 상태를 방지하여 시스템 효율성을 극대화합니다.

- 동기 vs 비동기:
- 동기(Synchronous): 순차적으로 명령을 실행하며, 앞선 작업이 완료될 때까지 다음 작업을 차단(Blocking)합니다.
- 비동기(Asynchronous): 작업 완료 여부와 관계없이 다음 명령을 호출하며, 작업 완료 시점에 이벤트 루프 등을 통해 결과를 처리합니다.

### 2. 주요 개념
- 코루틴(Coroutine): 실행을 일시 중단하고 재개할 수 있는 특수한 형태의 함수입니다. 파이썬에서는 async def로 정의하며, 호출 시 코루틴 객체를 반환합니다.
- 이벤트 루프(Event Loop): 비동기 함수들을 관리하고 실행하는 중앙 제어 장치로, 대기 중인 작업을 모니터링하다 완료된 시점부터 실행을 재개합니다.
- await 키워드: 코루틴의 작업이 완료될 때까지 실행을 일시 정지시키며, 그동안 제어권을 이벤트 루프에 반환하여 다른 작업을 수행할 수 있게 합니다.

### 3. 실습 코드 요약
- 비동기 함수 정의 및 실행
- asyncio.sleep()을 사용하여 비차단(Non-blocking) 대기를 수행하는 예제입니다.

```python

import asyncio
import time

async def fetch_data_async(name):
    print(f"데이터 조회 시작: {name}")
    await asyncio.sleep(2)  # 2초 동안 제어권을 이벤트 루프에 반환
    print(f"데이터 조회 완료: {name}")

async def run_async_example():
    start_time = time.time()
    # asyncio.gather를 통해 여러 비동기 작업을 병렬로 실행
    await asyncio.gather(
        fetch_data_async("작업1"),
        fetch_data_async("작업2")
    )
    end_time = time.time()
    print(f"비동기 총 소요 시간: {end_time - start_time:.2f}초")

# 실행 (Jupyter/Colab 환경에서는 await 사용 가능)
await run_async_example()
(asyncio.gather를 사용하면 여러 코루틴을 동시에 등록하여 병렬적으로 실행 가능)
```

### 4. 학습 포인트
- 비동기 함수라도 루프 내에서 단순히 await를 반복 사용하면 동기 방식처럼 순차 실행될 수 있습니다.
- 효율적인 병렬 처리를 위해서는 asyncio.gather()와 같이 여러 작업을 한꺼번에 이벤트 루프에 등록하는 방식이 필요합니다.
- 일반적인 Python 환경(.py)에서는 asyncio.run(main())을 통해 이벤트 루프를 시작해야 합니다.