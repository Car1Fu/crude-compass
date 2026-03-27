from openrouter_config import OPENROUTER_MODEL, build_openrouter_client


def main():
    client = build_openrouter_client()
    stream = client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=[
            {
                "role": "user",
                "content": "请简单介绍一下区块链调度的挑战。",
            }
        ],
        stream=True,
    )

    for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)


if __name__ == "__main__":
    main()
