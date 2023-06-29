<!--
 * @Author: tangdaoyong
 * @Date: 2023-06-18 18:21:57
 * @LastEditors: tangdaoyong
 * @LastEditTime: 2023-06-30 00:47:47
 * @Description: instance设置多个旋转立方体
-->
<template>
    <canvas id="canvas"></canvas>
</template>
<script setup lang="ts">
import { onMounted } from 'vue'
import triangleVert from './cubes.vert.wgsl?raw'
import triangleFrag from './cubes.frag.wgsl?raw'
import cubeVertex from './cubes'
import { getMvpMatrix } from './math'

const CubeNum = 10000

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
            // Culling backfaces pointing away from the camera
            cullMode: 'back',
            frontFace: 'ccw'
        },
        // Enable depth testing since we have z-level positions
        // Fragment closest to the camera is rendered in front
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        }
    }
    return await device.createRenderPipelineAsync(descriptor)
}

const creatBuffer = (device: GPUDevice, pipeline: GPURenderPipeline, size: {width:number, height:number}) => {
    // create depthTexture for renderPass
    const depthTexture = device.createTexture({
        size, format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })
    const depthView = depthTexture.createView()
    // create vertex buffer
    const vertexBuffer = device.createBuffer({
        label: 'GPUBuffer store vertex',
        size: cubeVertex.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(vertexBuffer, 0, cubeVertex)
    // create a mvp matrix buffer
    const mvpBuffer = device.createBuffer({
        label: 'GPUBuffer store 4x4 matrix',
        size: 4 * 4 * 4 * CubeNum, // 4 x 4 x float32
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })
    // create a uniform group for Matrix
    const uniformGroup = device.createBindGroup({
        label: 'Uniform Group with Matrix',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: mvpBuffer,
                }
            }
        ]
    })
    return { vertexBuffer, depthView, mvpBuffer, uniformGroup, depthTexture }
}

// create & submit device commands
const draw = (
    device: GPUDevice,
    context: GPUCanvasContext,
    pipeline: GPURenderPipeline,
    bufferObj: {
        vertexBuffer: GPUBuffer
        uniformGroup: GPUBindGroup
        depthView: GPUTextureView
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
        depthStencilAttachment: {
            view: bufferObj.depthView,
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        }
    }
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
    passEncoder.setPipeline(pipeline)
    // set vertex
    passEncoder.setVertexBuffer(0, bufferObj.vertexBuffer)
    // set uniformGroup
    passEncoder.setBindGroup(0, bufferObj.uniformGroup)
    // 3 vertex form a triangle
    passEncoder.draw(cubeVertex.length / 3, CubeNum)
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
    const bufferObj = creatBuffer(device, pipeline, canvasSize)

    let aspect = canvasSize.width / canvasSize.height
    const cubeArr = []
    for (let i = 0; i < CubeNum; i++) {
        const position = {x: Math.random() * 40 - 20, y: Math.random() * 40 - 20, z: -40 - Math.random() * 40}
        cubeArr.push({
            position,
            rotation: {x: 0, y: 0, z:0},
            scale: {x:1, y:1, z:1},
        })
    }
    const mvpBuffer = new Float32Array(CubeNum * 4 * 4)
    // start loop
    function frame() {
        console.time('draw')
        // rotate by time, and update transform matrix
        for (let i = 0; i < cubeArr.length; i++) {
            const {position, rotation, scale} = cubeArr[i]
            const now = Date.now() / 1000
            rotation.x = Math.sin(now)
            rotation.y = Math.cos(now)
            const mvpMatrix = getMvpMatrix(aspect, position, rotation, scale)
            // device.queue.writeBuffer(
            //     bufferObj.mvpBuffer,
            //     64 * i,
            //     mvpMatrix.buffer
            // )
            mvpBuffer.set(mvpMatrix, 16 * i)
        }
        device.queue.writeBuffer(
            bufferObj.mvpBuffer,
            0,
            mvpBuffer
        )
        // then draw
        draw(device, context, pipeline, bufferObj)
        console.timeEnd('draw')
        requestAnimationFrame(frame)
    }
    frame()

    // re-configure context on resize
    window.addEventListener('resize', ()=>{
        canvasSize.width = canvas.width = canvas.clientWidth * devicePixelRatio
        canvasSize.height = canvas.height = canvas.clientHeight * devicePixelRatio
        // don't need to recall context.configure() after v104
        // re-create depth texture
        bufferObj.depthTexture.destroy()
        bufferObj.depthTexture = device.createTexture({
            size: canvasSize, format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        })
        bufferObj.depthView = bufferObj.depthTexture.createView()
        // update aspect
        aspect = canvasSize.width / canvasSize.height
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
