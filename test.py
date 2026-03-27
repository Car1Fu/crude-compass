from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="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"
)

# 发送请求（开启流式）
stream = client.chat.completions.create(
    model="openai/gpt-4o-mini",  # 可以换成你想用的模型
    messages=[
        {"role": "user", "content": "请简单介绍一下区块链调度的挑战"}
    ],
    stream=True
)

# 流式接收并打印
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)