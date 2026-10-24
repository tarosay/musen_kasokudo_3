
速度 = 0
周期 = 0
方向 = 0
y = 0
今 = 0
名前Y = ""

# 調整用パラメータ
反転しきい値 = 150
運動しきい値 = 35
停止時間 = 150
送信間隔 = 50
最低周期 = 50
最高周期 = 350

# 山・谷の検出
前回Y = 0
前回測定時刻 = 0
最大Y = 0
最小Y = 0
最大時刻 = 0
最小時刻 = 0
最大前Y = 0
最小前Y = 0
最大前時刻 = 0
最小前時刻 = 0
最大後Y = 0
最小後Y = 0
最大後時刻 = -1
最小後時刻 = -1

# 周期と運動の判定
前回山時刻 = -1
前回谷時刻 = -1
最終有効反転時刻 = -1
運動ピーク = 0
送信時刻 = 0

# 放物線補間
def 極値時刻(t0, v0, t1, v1, t2, v2):
    h1 = t1 - t0
    h2 = t2 - t1

    if h1 <= 0 or h2 <= 0:
        return t1

    s1 = (v1 - v0) / h1
    s2 = (v2 - v1) / h2

    if s1 == s2:
        return t1

    補正 = (0 - (h2 * s1 + h1 * s2)) / (2 * (s2 - s1))

    if 補正 < (0 - h1) or 補正 > h2:
        return t1

    return t1 + 補正

# 周波数から速度へ変換
def 速度変換(測定周期):
    v = 10000 / 測定周期

    if v > 100:
        v = 100

    if v <= 60:
        v = v * 0.5
    elif v <= 90:
        v = 30 + (v - 60) * 2

    return v

# A/Bの識別
if input.button_is_pressed(Button.A):
    名前Y = "AY"
    basic.show_string("A")
else:
    名前Y = "BY"
    basic.show_string("B")

y = input.acceleration(Dimension.Y)
前回Y = y
最大Y = y
最小Y = y
前回測定時刻 = input.running_time()
送信時刻 = 前回測定時刻

# 静止状態での合成加速度を基準にする
基準強度 = input.acceleration(Dimension.STRENGTH)

serial.redirect(SerialPin.USB_TX, SerialPin.USB_RX,
    BaudRate.BAUD_RATE115200)

def on_forever():
    global 速度, 周期, 方向, y, 今
    global 前回Y, 前回測定時刻
    global 最大Y, 最小Y, 最大時刻, 最小時刻
    global 最大前Y, 最小前Y
    global 最大前時刻, 最小前時刻
    global 最大後Y, 最小後Y
    global 最大後時刻, 最小後時刻
    global 前回山時刻, 前回谷時刻
    global 最終有効反転時刻
    global 運動ピーク, 送信時刻

    今 = input.running_time()
    y = input.acceleration(Dimension.Y)

    # 合成加速度から実際の運動を検出
    強度 = input.acceleration(Dimension.STRENGTH)
    運動量 = abs(強度 - 基準強度)

    if 運動量 > 運動ピーク:
        運動ピーク = 運動量

    # 最後の有効振動から150msで停止
    if 最終有効反転時刻 >= 0:
        if 今 - 最終有効反転時刻 >= 停止時間:
            速度 = 0
            方向 = 0
            前回山時刻 = -1
            前回谷時刻 = -1
            最終有効反転時刻 = -1
            運動ピーク = 0
            最大Y = y
            最小Y = y

    if y != 前回Y:

        # 振動方向の初期検出
        if 方向 == 0:
            if y > 最大Y:
                最大Y = y
            if y < 最小Y:
                最小Y = y

            if y - 最小Y >= 反転しきい値:
                方向 = 1
                最大Y = y
                最大時刻 = 今
                最大前Y = 前回Y
                最大前時刻 = 前回測定時刻
                最大後時刻 = -1

            elif 最大Y - y >= 反転しきい値:
                方向 = -1
                最小Y = y
                最小時刻 = 今
                最小前Y = 前回Y
                最小前時刻 = 前回測定時刻
                最小後時刻 = -1

        # 上昇中：山を検出
        elif 方向 == 1:
            if y > 最大Y:
                最大前Y = 前回Y
                最大前時刻 = 前回測定時刻
                最大Y = y
                最大時刻 = 今
                最大後時刻 = -1

            elif y < 最大Y and 最大後時刻 < 0:
                最大後Y = y
                最大後時刻 = 今

            if 最大Y - y >= 反転しきい値:
                山時刻 = 最大時刻

                if 最大後時刻 > 最大時刻:
                    山時刻 = 極値時刻(
                        最大前時刻, 最大前Y,
                        最大時刻, 最大Y,
                        最大後時刻, 最大後Y)

                # 合成加速度による有効振動判定
                if 運動ピーク >= 運動しきい値:
                    if 前回山時刻 >= 0:
                        周期 = 山時刻 - 前回山時刻

                        if 周期 >= 最低周期 and 周期 <= 最高周期:
                            速度 = 速度変換(周期)
                        else:
                            速度 = 0

                    前回山時刻 = 山時刻
                    最終有効反転時刻 = 今
                else:
                    # 回転・傾きだけと判断した振動は無効
                    速度 = 0
                    前回山時刻 = -1
                    前回谷時刻 = -1

                運動ピーク = 0
                方向 = -1
                最小Y = y
                最小時刻 = 今
                最小前Y = 前回Y
                最小前時刻 = 前回測定時刻
                最小後時刻 = -1

        # 下降中：谷を検出
        else:
            if y < 最小Y:
                最小前Y = 前回Y
                最小前時刻 = 前回測定時刻
                最小Y = y
                最小時刻 = 今
                最小後時刻 = -1

            elif y > 最小Y and 最小後時刻 < 0:
                最小後Y = y
                最小後時刻 = 今

            if y - 最小Y >= 反転しきい値:
                谷時刻 = 最小時刻

                if 最小後時刻 > 最小時刻:
                    谷時刻 = 極値時刻(
                        最小前時刻, 最小前Y,
                        最小時刻, 最小Y,
                        最小後時刻, 最小後Y)

                # 合成加速度による有効振動判定
                if 運動ピーク >= 運動しきい値:
                    if 前回谷時刻 >= 0:
                        周期 = 谷時刻 - 前回谷時刻

                        if 周期 >= 最低周期 and 周期 <= 最高周期:
                            速度 = 速度変換(周期)
                        else:
                            速度 = 0

                    前回谷時刻 = 谷時刻
                    最終有効反転時刻 = 今
                else:
                    # 回転・傾きだけと判断した振動は無効
                    速度 = 0
                    前回山時刻 = -1
                    前回谷時刻 = -1

                運動ピーク = 0
                方向 = 1
                最大Y = y
                最大時刻 = 今
                最大前Y = 前回Y
                最大前時刻 = 前回測定時刻
                最大後時刻 = -1

        前回Y = y
        前回測定時刻 = 今

    # シリアル出力
    if 今 - 送信時刻 >= 送信間隔:
        serial.write_value(名前Y, Math.round(速度))
        送信時刻 = 今

    basic.pause(5)

basic.forever(on_forever)
