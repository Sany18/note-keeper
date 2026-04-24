// @ts-ignore
export const isMac = navigator.userAgentData ? navigator.userAgentData.platform === 'macOS' : navigator.platform.startsWith('Mac')

export const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

export const ctrlBtnName = isMac ? 'Cmd' : 'Ctrl'
