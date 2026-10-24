// 周波数から速度への変換
function 速度変換 (測定周期: number) {
    v = 10000 / 測定周期
    if (v > 100) {
        v = 100
    }
    if (v <= 60) {
        v = v * 0.5
    } else if (v <= 90) {
        v = 30 + (v - 60) * 2
    }
    return v
}
// 放物線補間
function 極値補間 (t0: number, v0: number, t1: number, v1: number, t2: number, v2: number) {
    h1 = t1 - t0
    h2 = t2 - t1
    if (h1 <= 0 || h2 <= 0) {
        return t1
    }
    s1 = (v1 - v0) / h1
    s2 = (v2 - v1) / h2
    if (s1 == s2) {
        return t1
    }
    補正 = (0 - (h2 * s1 + h1 * s2)) / (2 * (s2 - s1))
    if (補正 < 0 - h1 || 補正 > h2) {
        return t1
    }
    return t1 + 補正
}
/**
 * 山・谷の測定
 */
let 谷後値 = 0
let 周期 = 0
let 山後値 = 0
let 谷前時刻 = 0
let 谷前値 = 0
let 谷時刻 = 0
let 山前時刻 = 0
let 山前値 = 0
let 山時刻 = 0
let 方向 = 0
let 速度 = 0
let 強度2 = 0
let y = 0
let 今 = 0
let 補正 = 0
let s2 = 0
let s1 = 0
let h2 = 0
let h1 = 0
let v = 0
let 名前Y = ""
// 調整用パラメータ
let 反転しきい値 = 150
let 運動幅しきい値 = 25
let 停止時間 = 150
let 送信間隔 = 50
let 最低周期 = 50
let 最高周期 = 350
let 山後時刻 = -1
let 谷後時刻 = -1
let 前回山時刻 = -1
let 前回谷時刻 = -1
let 前回極値時刻 = -1
let 前回反転時刻 = -1
// A/Bの識別
if (input.buttonIsPressed(Button.A)) {
    名前Y = "AY"
    basic.showString("A")
} else {
    名前Y = "BY"
    basic.showString("B")
}
let 前回Y = input.acceleration(Dimension.Y)
let 山値 = 前回Y
let 谷値 = 前回Y
let 前回測定時刻 = input.runningTime()
let 送信時刻 = 前回測定時刻
let 強度 = input.acceleration(Dimension.Strength)
let 最大強度 = 強度
let 最小強度 = 強度
serial.redirect(
SerialPin.USB_TX,
SerialPin.USB_RX,
BaudRate.BaudRate115200
)
basic.forever(function () {
    let t: number;
今 = input.runningTime()
    y = input.acceleration(Dimension.Y)
    強度2 = input.acceleration(Dimension.Strength)
    // 合成加速度の変動幅を測定
    if (強度2 > 最大強度) {
        最大強度 = 強度2
    }
    if (強度2 < 最小強度) {
        最小強度 = 強度2
    }
    // 停止判定
    if (前回反転時刻 >= 0) {
        if (今 - 前回反転時刻 >= 停止時間) {
            速度 = 0
            方向 = 0
            前回山時刻 = -1
            前回谷時刻 = -1
            前回極値時刻 = -1
            前回反転時刻 = -1
            山値 = y
            谷値 = y
            最大強度 = 強度2
            最小強度 = 強度2
        }
    }
    if (y != 前回Y) {
        // 初期方向の検出
        if (方向 == 0) {
            if (y > 山値) {
                山値 = y
            }
            if (y < 谷値) {
                谷値 = y
            }
            if (y - 谷値 >= 反転しきい値) {
                方向 = 1
                山値 = y
                山時刻 = 今
                山前値 = 前回Y
                山前時刻 = 前回測定時刻
                山後時刻 = -1
            } else if (山値 - y >= 反転しきい値) {
                方向 = -1
                谷値 = y
                谷時刻 = 今
                谷前値 = 前回Y
                谷前時刻 = 前回測定時刻
                谷後時刻 = -1
            }
        } else if (方向 == 1) {
            // 上昇中：山の検出
            if (y > 山値) {
                山前値 = 前回Y
                山前時刻 = 前回測定時刻
                山値 = y
                山時刻 = 今
                山後時刻 = -1
            } else if (y < 山値 && 山後時刻 < 0) {
                山後値 = y
                山後時刻 = 今
            }
            if (山値 - y >= 反転しきい値) {
                t = 山時刻
                if (山後時刻 > 山時刻) {
                    t = 極値補間(山前時刻, 山前値, 山時刻, 山値, 山後時刻, 山後値)
                }
                // 合成加速度の変動幅で判定
                if (最大強度 - 最小強度 >= 運動幅しきい値) {
                    if (前回山時刻 >= 0) {
                        周期 = t - 前回山時刻
                    } else if (前回極値時刻 >= 0) {
                        周期 = 2 * (t - 前回極値時刻)
                    } else {
                        周期 = 0
                    }
                    if (周期 >= 最低周期 && 周期 <= 最高周期) {
                        速度 = 速度変換(周期)
                    } else {
                        速度 = 0
                    }
                    前回山時刻 = t
                    前回極値時刻 = t
                    前回反転時刻 = 今
                } else {
                    速度 = 0
                    前回山時刻 = -1
                    前回谷時刻 = -1
                    前回極値時刻 = -1
                }
                方向 = -1
                谷値 = y
                谷時刻 = 今
                谷前値 = 前回Y
                谷前時刻 = 前回測定時刻
                谷後時刻 = -1
                最大強度 = 強度2
                最小強度 = 強度2
            }
        } else {
            // 下降中：谷の検出
            if (y < 谷値) {
                谷前値 = 前回Y
                谷前時刻 = 前回測定時刻
                谷値 = y
                谷時刻 = 今
                谷後時刻 = -1
            } else if (y > 谷値 && 谷後時刻 < 0) {
                谷後値 = y
                谷後時刻 = 今
            }
            if (y - 谷値 >= 反転しきい値) {
                t = 谷時刻
                if (谷後時刻 > 谷時刻) {
                    t = 極値補間(谷前時刻, 谷前値, 谷時刻, 谷値, 谷後時刻, 谷後値)
                }
                // 合成加速度の変動幅で判定
                if (最大強度 - 最小強度 >= 運動幅しきい値) {
                    if (前回谷時刻 >= 0) {
                        周期 = t - 前回谷時刻
                    } else if (前回極値時刻 >= 0) {
                        周期 = 2 * (t - 前回極値時刻)
                    } else {
                        周期 = 0
                    }
                    if (周期 >= 最低周期 && 周期 <= 最高周期) {
                        速度 = 速度変換(周期)
                    } else {
                        速度 = 0
                    }
                    前回谷時刻 = t
                    前回極値時刻 = t
                    前回反転時刻 = 今
                } else {
                    速度 = 0
                    前回山時刻 = -1
                    前回谷時刻 = -1
                    前回極値時刻 = -1
                }
                方向 = 1
                山値 = y
                山時刻 = 今
                山前値 = 前回Y
                山前時刻 = 前回測定時刻
                山後時刻 = -1
                最大強度 = 強度2
                最小強度 = 強度2
            }
        }
        前回Y = y
        前回測定時刻 = 今
    }
    // シリアル出力
    if (今 - 送信時刻 >= 送信間隔) {
        serial.writeValue(名前Y, Math.round(速度))
        送信時刻 = 今
    }
    basic.pause(5)
})
