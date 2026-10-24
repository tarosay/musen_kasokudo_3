let 周期 = 0
let 新状態 = 0
let 振動状態 = 0
let 速度 = 0
let 振動 = 0
let y = 0
let 今 = 0
let 名前Y = ""
let 前回反転時刻 = -1
// 調整用パラメータ
let 振動しきい値 = 150
let 変化しきい値 = 40
let 停止時間 = 150
let 送信間隔 = 100
// A/Bの識別
if (input.buttonIsPressed(Button.A)) {
    名前Y = "AY"
    basic.showString("A")
} else {
    名前Y = "BY"
    basic.showString("B")
}
let 重力Y = input.acceleration(Dimension.Y)
let 前回Y = 重力Y
let 最終変化時刻 = input.runningTime()
let 送信時刻 = input.runningTime()
serial.redirect(
SerialPin.USB_TX,
SerialPin.USB_RX,
BaudRate.BaudRate115200
)
basic.forever(function () {
    今 = input.runningTime()
    y = input.acceleration(Dimension.Y)
    // 加速度の変化から振動停止を検出
    if (Math.abs(y - 前回Y) >= 変化しきい値) {
        最終変化時刻 = 今
    }
    前回Y = y
    // 重力成分を除去して振動を抽出
    重力Y = 重力Y * 0.9 + y * 0.1
    振動 = y - 重力Y
    // 停止判定（150ms）
    if (今 - 最終変化時刻 >= 停止時間) {
        速度 = 0
        振動状態 = 0
        前回反転時刻 = -1
    } else {
        // 振動の正負を判定
        新状態 = 振動状態
        if (振動 > 振動しきい値) {
            新状態 = 1
        } else if (振動 < 0 - 振動しきい値) {
            新状態 = -1
        }
        // 半周期ごとに速度を更新
        if (新状態 != 振動状態) {
            if (振動状態 != 0 && 前回反転時刻 >= 0) {
                周期 = 今 - 前回反転時刻
                if (周期 >= 60 && 周期 <= 600) {
                    速度 = 5000 / 周期
                    if (速度 > 100) {
                        速度 = 100
                    }
                }
            }
            前回反転時刻 = 今
            振動状態 = 新状態
        }
    }
    // Y成分のみ100msごとに送信
    if (今 - 送信時刻 >= 送信間隔) {
        serial.writeValue(名前Y, Math.round(速度))
        送信時刻 = 今
    }
    basic.pause(20)
})
