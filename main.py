

速度 = 0
周期 = 0
振動 = 0
振動状態 = 0
新状態 = 0
前回反転時刻 = -1
今 = 0
y = 0
前回Y = 0
重力Y = 0
名前Y = ""

# 調整用パラメータ
振動しきい値 = 150
変化しきい値 = 40
停止時間 = 150
送信間隔 = 100

radio.set_group(191)

# A/Bの識別
if input.button_is_pressed(Button.A):
    名前Y = "AY"
    basic.show_string("A")
else:
    名前Y = "BY"
    basic.show_string("B")

重力Y = input.acceleration(Dimension.Y)
前回Y = 重力Y
最終変化時刻 = input.running_time()
送信時刻 = input.running_time()

def on_forever():
    global 今, y, 前回Y, 重力Y
    global 振動, 振動状態, 新状態
    global 前回反転時刻, 周期, 速度
    global 最終変化時刻, 送信時刻

    今 = input.running_time()
    y = input.acceleration(Dimension.Y)

    # 加速度の変化から振動停止を検出
    if abs(y - 前回Y) >= 変化しきい値:
        最終変化時刻 = 今
    前回Y = y

    # 重力成分を除去して振動を抽出
    重力Y = 重力Y * 0.9 + y * 0.1
    振動 = y - 重力Y

    # 停止判定（150ms）
    if 今 - 最終変化時刻 >= 停止時間:
        速度 = 0
        振動状態 = 0
        前回反転時刻 = -1
    else:
        # 振動の正負を判定
        新状態 = 振動状態
        if 振動 > 振動しきい値:
            新状態 = 1
        elif 振動 < 0 - 振動しきい値:
            新状態 = -1

        # 半周期ごとに速度を更新
        if 新状態 != 振動状態:
            if 振動状態 != 0 and 前回反転時刻 >= 0:
                周期 = 今 - 前回反転時刻
                if 周期 >= 60 and 周期 <= 600:
                    速度 = 10000 / 周期
                    if 速度 > 100:
                        速度 = 100

            前回反転時刻 = 今
            振動状態 = 新状態

    # Y成分のみ100msごとに送信
    if 今 - 送信時刻 >= 送信間隔:
        radio.send_value(名前Y, Math.round(速度))
        送信時刻 = 今

    basic.pause(20)

basic.forever(on_forever)
