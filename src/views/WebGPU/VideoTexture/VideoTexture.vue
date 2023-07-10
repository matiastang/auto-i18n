<!--
 * @Author: tangdaoyong
 * @Date: 2023-06-18 18:21:57
 * @LastEditors: tangdaoyong
 * @LastEditTime: 2023-07-10 23:49:42
 * @Description: 4. 旋转立方体
-->
<template>
    <canvas id="canvas"></canvas>
</template>
<script setup lang="ts">
import { onMounted } from 'vue'
import triangleVert from './rotatingCube.vert.wgsl?raw'
import triangleFrag from './rotatingCube.frag.wgsl?raw'
import cubeVertex from './cube'
import { getMvpMatrix } from './math'
import videoUrl from '@/static/video.mp4?url'

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
                    arrayStride: 5 * 4, // 3 position 2 uv,
                    attributes: [
                        {
                            // position
                            shaderLocation: 0,
                            offset: 0,
                            format: 'float32x3'
                        },
                        {
                            // uv
                            shaderLocation: 1,
                            offset: 3 * 4,
                            format: 'float32x2'
                        }
                    ]
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
        size: 4 * 4 * 4, // 4 x 4 x float32
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    // create a uniform group for Matrix
    const uniformGroup = device.createBindGroup({
        label: 'Uniform Group with Matrix',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: mvpBuffer
                }
            }
        ]
    })
    return { vertexBuffer, uniformGroup, depthView, mvpBuffer, depthTexture }
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
    },
    videoGroup: GPUBindGroup
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
    // set videoGroup
    passEncoder.setBindGroup(1, videoGroup)
    // set uniformGroup
    passEncoder.setBindGroup(0, bufferObj.uniformGroup)
    // 3 vertex form a triangle
    passEncoder.draw(cubeVertex.length / 5)
    passEncoder.end()
    // webgpu run in a separate process, all the commands will be executed after submit
    device.queue.submit([commandEncoder.finish()])
}

const init = async () => {
    // set Video element and play in advanced
    const video = document.createElement('video');
    video.loop = true
    video.autoplay = true
    video.muted = true
    video.src = videoUrl
    await video.play()

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
    const position = {x:0, y:0, z: -5}
    const rotation = {x: 0, y: 0, z:0}
    const scale = {x:1, y:1, z:1}

    // Create a sampler with linear filtering for smooth interpolation.
    const sampler = device.createSampler({
        // addressModeU: 'repeat',
        // addressModeV: 'repeat',
        magFilter: 'linear',
        minFilter: 'linear'
    })
    
    // start loop
    function frame() {
        // video frame rate may not different with page render rate
        // we can use VideoFrame to force video decoding current frame
        const videoFrame = new VideoFrame(video)
        // it can be imported to webgpu as texture source with the `webgpu-developer-features` flag enabled
        // const texture = device.importExternalTexture({
        //     source: videoFrame // need `webgpu-developer-features`
        // })
        // but in this demo, we don't acctully use it, just close it
        videoFrame.close()

        // external texture will be automatically destroyed as soon as JS returns
        // cannot be interrupt by any async functions before renderring
        // e.g. event callbacks, or await functions
        // so need to re-load external video every frame
        const texture = device.importExternalTexture({
            source: video
        })

        // also need to re-create a bindGroup for external texture
        const videoGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: sampler
                },
                {
                    binding: 1,
                    resource: texture
                }
            ]
        })
        // rotate by time, and update transform matrix
        const now = Date.now() / 1000
        rotation.x = Math.sin(now)
        rotation.y = Math.cos(now)
        const mvpMatrix = getMvpMatrix(aspect, position, rotation, scale)
        device.queue.writeBuffer(
            bufferObj.mvpBuffer,
            0,
            mvpMatrix.buffer
        )
        // then draw
        draw(device, context, pipeline, bufferObj, videoGroup)
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
