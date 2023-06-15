<!--
 * @Author: tangdaoyong
 * @Date: 2023-05-15 22:53:20
 * @LastEditors: tangdaoyong
 * @LastEditTime: 2023-05-22 22:03:12
 * @Description: 3. 颜色三角形
-->
<template>
    <canvas id="canvas"></canvas>
    <div class="inputs">
        <!-- <input type="color" :value="colorValue" />
        <input type="range" min="-0.5" max="0.5" step="0.1" :value="positionValue" /> -->
        <input type="color" value="#FF0000" />
        <input type="range" min="-0.5" max="0.5" step="0.1" value="0" />
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import triangleVert from './shaders/colorTriangle/triangle.vert.wgsl?raw'
import triangleFrag from './shaders/colorTriangle/triangle.frag.wgsl?raw'
// import { GPURenderPipelineDescriptor } from '@webgpu/types'

const colorValue = ref('#FF0000')
const positionValue = ref(0)

const vertex = new Float32Array([0.0, 0.5, 0.0, -0.5, -0.5, 0.0, 0.5, -0.5, 0.0])
const vertexCount = 3

/**
 * 获取canvas
 */
const initCanvas = () => {
    // 获取canvas元素
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('No Canvas')
    // 获取webgpu上下文
    const context = canvas.getContext('webgpu')
    if (!context) {
        throw new Error('No webgpu')
    }
    return { canvas, context }
}

/**
 * 初始化WebGPU
 */
const initWebGPU = async () => {
    // 获取gpu
    const gpu = navigator.gpu
    if (!gpu) {
        throw new Error('Not support WebGPU')
    }
    // 请求Adapter
    const adapter = await gpu.requestAdapter()
    if (!adapter) {
        throw new Error('No adapter found')
    }
    // 获取Device
    const device = await adapter.requestDevice()
    // 获取默认的的数据格式
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
        label: 'Basic Pipline',
        layout: 'auto',
        vertex: {
            module: vertModule,
            entryPoint: 'main',
            buffers: [
                {
                    arrayStride: 3 * 4, // 3 float32,
                    attributes: [
                        {
                            // position xyz
                            shaderLocation: 0,
                            offset: 0,
                            format: 'float32x3',
                        },
                    ],
                },
            ],
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
        primitive: {
            topology: 'triangle-list', // triangle-list try point-list, line-list, line-strip, triangle-strip?
        },
    }
    return await device.createRenderPipelineAsync(descriptor)
}

const creatBuffer = (device: GPUDevice, pipeline: GPURenderPipeline) => {
    const vertexBuffer = device.createBuffer({
        label: 'GPUBuffer store vertex',
        size: vertex.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(vertexBuffer, 0, vertex)
    const colorBuffer = device.createBuffer({
        label: 'GPUBuffer store rgba color',
        size: 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(colorBuffer, 0, new Float32Array([1, 0, 0, 1]))
    // create a uniform group for color
    const uniformGroup = device.createBindGroup({
        label: 'Uniform Group with colorBuffer',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: colorBuffer,
                },
            },
        ],
    })
    return { vertexBuffer, colorBuffer, uniformGroup }
}

// create & submit device commands
const draw = (
    device: GPUDevice,
    context: GPUCanvasContext,
    pipeline: GPURenderPipeline,
    bufferObj: {
        vertexBuffer: GPUBuffer
        colorBuffer: GPUBuffer
        uniformGroup: GPUBindGroup
    }
) => {
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
    // set uniformGroup
    passEncoder.setBindGroup(0, bufferObj.uniformGroup)
    // set vertex
    passEncoder.setVertexBuffer(0, bufferObj.vertexBuffer)
    // 3 vertex form a triangle
    passEncoder.draw(vertexCount)
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
    // 配置context
    context.configure({
        // json specific format when key and value are the same
        device,
        format,
        // prevent chrome warning
        alphaMode: 'opaque',
    })
    const pipeline = await initPipeline(device, format)
    const bufferObj = creatBuffer(device, pipeline)
    // start draw
    draw(device, context, pipeline, bufferObj)

    // update colorBuffer if color changed
    document.querySelector('input[type="color"]')?.addEventListener('input', (e: Event) => {
        // get hex color string
        const color = (e.target as HTMLInputElement).value
        console.log(color)
        // parse hex color into rgb
        const r = +('0x' + color.slice(1, 3)) / 255
        const g = +('0x' + color.slice(3, 5)) / 255
        const b = +('0x' + color.slice(5, 7)) / 255
        // write colorBuffer with new color
        device.queue.writeBuffer(bufferObj.colorBuffer, 0, new Float32Array([r, g, b, 1]))
        draw(device, context, pipeline, bufferObj)
    })
    // update vertexBuffer
    document.querySelector('input[type="range"]')?.addEventListener('input', (e: Event) => {
        // get input value
        const value = +(e.target as HTMLInputElement).value
        // chagne vertex 0/3/6
        vertex[0] = 0 + value
        vertex[3] = -0.5 + value
        vertex[6] = 0.5 + value
        // write vertexBuffer with new vertex
        device.queue.writeBuffer(bufferObj.vertexBuffer, 0, vertex)
        draw(device, context, pipeline, bufferObj)
    })

    window.addEventListener('resize', () => {
        canvas.width = canvas.clientWidth * devicePixelRatio
        canvas.height = canvas.clientHeight * devicePixelRatio
        // don't need to recall context.configure() after v104
        draw(device, context, pipeline, bufferObj)
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
.inputs {
    position: fixed;
    top: 10px;
    right: 10px;
}
</style>
