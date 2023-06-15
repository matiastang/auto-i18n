/*
 * @Author: matiastang
 * @Date: 2021-12-07 10:13:53
 * @LastEditors: matiastang
 * @LastEditTime: 2021-12-09 14:25:05
 * @FilePath: /datumwealth-openalpha-front/src/common/utils/message/index.ts
 * @Description: 提示相关
 */
import { ElMessage } from 'element-plus'

/**
 * 提示封装
 */
function DWMessage(options: { message: string; type: string }) {
    const { message, type } = options
    if (type === 'error') {
        if (message.endsWith('取消请求')) {
            //FIXME: - 为解决登录过期而添加，如果有主动取消，可能不满足要求
            console.info('取消请求不提示')
            return
        }
        ElMessage.error(message)
    } else if (type === 'success') {
        ElMessage.success(message)
    } else if (type === 'warning') {
        if (message.endsWith('取消请求')) {
            //FIXME: - 为解决登录过期而添加，如果有主动取消，可能不满足要求
            console.info('取消请求不提示')
            return
        }
        ElMessage.warning(message)
    } else {
        ElMessage.info(message)
    }
}
DWMessage.success = (message: string) => {
    ElMessage.success(message)
}
DWMessage.error = (message: string) => {
    if (message.endsWith('取消请求')) {
        //FIXME: - 为解决登录过期而添加，如果有主动取消，可能不满足要求
        console.info('取消请求不提示')
        return
    }
    ElMessage.error(message)
}
DWMessage.warning = (message: string) => {
    if (message.endsWith('取消请求')) {
        //FIXME: - 为解决登录过期而添加，如果有主动取消，可能不满足要求
        console.info('取消请求不提示')
        return
    }
    ElMessage.warning(message)
}
DWMessage.info = (message: string) => {
    ElMessage.info(message)
}

export default DWMessage
