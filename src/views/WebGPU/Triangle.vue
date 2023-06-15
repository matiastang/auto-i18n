<!--
 * @Author: tangdaoyong
 * @Date: 2023-05-14 17:38:18
 * @LastEditors: tangdaoyong
 * @LastEditTime: 2023-05-22 21:24:53
 * @Description: 2. 三角形
-->
<template>
    <canvas id="canvas"></canvas>
</template>
<script setup lang="ts">
import { onMounted } from 'vue'
import triangleVert from './shaders/triangle/triangle.vert.wgsl?raw'
import triangleFrag from './shaders/triangle/triangle.frag.wgsl?raw'

const initCanvas = () => {
    const canvas = document.querySelector('canvas')
    // const canvas = document.getElementById('canvas') as HTMLCanvasElement | null
    if (!canvas) throw new Error('No Canvas')
    const context = canvas.getContext('webgpu')
    if (!context) {
        throw new Error('No webgpu')
    }
    return { canvas, context }
}

const initWebGPU = async () => {
    const gpu = navigator.gpu
    if (!gpu) {
        throw new Error('Not support WebGPU')
    }
    const adapter = await gpu.requestAdapter()
    if (!adapter) {
        throw new Error('No adapter found')
    }
    const device = await adapter.requestDevice()
    const format = gpu.getPreferredCanvasFormat()
    return { device, format }
}

const initPipeline = async (
    device: GPUDevice,
    format: GPUTextureFormat
): Promise<GPURenderPipeline> => {
    const vertModule = device.createShaderModule({
        code: triangleVert,
    })
    const fragModule = device.createShaderModule({
        code: triangleFrag,
    })
    const descriptor: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
            module: vertModule,
            entryPoint: 'main',
        },
        primitive: {
            topology: 'triangle-list', // triangle-list try point-list, line-list, line-strip, triangle-strip?
        },
        fragment: {
            module: fragModule,
            entryPoint: 'main',
            targets: [
                {
                    format: format,
                },
            ],
        },
    }
    return await device.createRenderPipelineAsync(descriptor)
}

// create & submit device commands
const draw = (device: GPUDevice, context: GPUCanvasContext, pipeline: GPURenderPipeline) => {
    const commandEncoder = device.createCommandEncoder()
    const view = context.getCurrentTexture().createView()
    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: view,
                clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
                loadOp: 'clear', // clear/load
                storeOp: 'store', // store/discard
            },
        ],
    }
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
    passEncoder.setPipeline(pipeline)
    // 3 vertex form a triangle
    passEncoder.draw(3)
    passEncoder.end()
    // webgpu run in a separate process, all the commands will be executed after submit
    device.queue.submit([commandEncoder.finish()])
}

const init = async () => {
    const { canvas, context } = initCanvas()
    const devicePixelRatio = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * devicePixelRatio
    canvas.height = canvas.clientHeight * devicePixelRatio
    const canvasSize = { width: canvas.width, height: canvas.height }
    const { device, format } = await initWebGPU()
    context.configure({
        // json specific format when key and value are the same
        device,
        format,
        // prevent chrome warning
        alphaMode: 'opaque',
    })
    const pipeline = await initPipeline(device, format)
    // start draw
    draw(device, context, pipeline)

    window.addEventListener('resize', () => {
        canvas.width = canvas.clientWidth * devicePixelRatio
        canvas.height = canvas.clientHeight * devicePixelRatio
        // don't need to recall context.configure() after v104
        draw(device, context, pipeline)
    })
}

onMounted(async () => {
    init()
})
</script>
<style lang="less" scoped>
#canvas {
    width: 100vw;
    height: 100vh;
}
</style>
