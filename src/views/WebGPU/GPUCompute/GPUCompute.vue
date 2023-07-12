<!--
 * @Author: tangdaoyong
 * @Date: 2023-07-12 22:47:41
 * @LastEditors: tangdaoyong
 * @LastEditTime: 2023-07-12 23:28:23
 * @Description: GPU Compute
-->
<template>
    <div class="page">
        <h2>Matrix Multiply Benchmark</h2>
        <select @change="selectChange" id="select" style="width:150px;height:2em;margin: 2em auto">
            <option v-for="item in options" :key="item.key" :value="item.key" :selected="item.key === selectedKey">{{ item.value }}</option>
        </select>
        <p>JS CPU: <span id="cpu">{{ CPUTime }}</span> ms (Average of 10x)</p>
        <p>WebGPU: <span id="gpu">{{ GPUTime }}</span> ms (Average of 300x)</p>
        <button @click="runClick" :disabled="disabled">Run</button>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {mat4} from 'gl-matrix'
import computeTransform from './compute.transform.wgsl?raw'

const options = [
    {
        key: 10000,
        value: '1W',
    },
    {
        key: 100000,
        value: '10W',
    },
    {
        key: 500000,
        value: '50W',
    },
    {
        key: 1000000,
        value: '100W',
    },
    {
        key: 5000000,
        value: '500W',
    },
]
const selectedKey = ref(options[0].key)
const NUM = ref(options[0].key)
const CPUTime = ref<string | null>(null)
const GPUTime = ref<string | null>(null)
const disabled = ref(false)

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
    const device = await adapter.requestDevice({
        requiredLimits: {
            maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize
        }
    })
    return device
}

const initPipeline = async (device: GPUDevice, modelMatrix:Float32Array, projection:Float32Array) => {
    const descriptor: GPUComputePipelineDescriptor = {
        layout: 'auto',
        compute: {
            module: device.createShaderModule({
                code: computeTransform
            }),
            entryPoint: 'main'
        }
    }
    const pipeline = await device.createComputePipelineAsync(descriptor)
    const modelBuffer = device.createBuffer({
        size: modelMatrix.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })
    console.time('writeBuffer')
    device.queue.writeBuffer(modelBuffer, 0, modelMatrix)
    console.timeEnd('writeBuffer')
    // hold a 4x4 projection buffer
    const projectionBuffer = device.createBuffer({
        size: projection.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })
    device.queue.writeBuffer(projectionBuffer, 0, projection)
    // create a n*4x4 matrix buffer to hold result
    const mvpBuffer = device.createBuffer({
        size: modelMatrix.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    })
    // indicate the size of total matrix
    const countBuffer = device.createBuffer({
        size: 4, // just one uint32 number
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })
    device.queue.writeBuffer(countBuffer, 0, new Uint32Array([NUM.value]))
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{
            binding: 0,
            resource: {
                buffer: modelBuffer
            }
        },{
            binding: 1,
            resource: {
                buffer: projectionBuffer
            }
        },{
            binding: 2,
            resource: {
                buffer: mvpBuffer
            }
        },{
            binding: 3,
            resource: {
                buffer: countBuffer
            }
        }]
    })
    return {pipeline, bindGroup, mvpBuffer}
}

const runAction = async () => {
    disabled.value = true
    const fakeMatrix = mat4.create()
    const modelMatrix = new Float32Array(NUM.value * 4 * 4) // hold gpu matrix
    const matrixArray: any[] = [] // hold cpu matrix
    const projection = fakeMatrix as Float32Array// fake projection matrix
    for(let i = 0; i < NUM.value; i++){
        matrixArray.push(fakeMatrix)
        modelMatrix.set(fakeMatrix, i * 4 * 4)
    }

    // start test cpu time
    console.time('cpu multiply x10')
    let start = performance.now()
    for(let i = 0; i < 10; i++) {
        for(let i = 0; i < NUM.value; i++){
            let m = matrixArray[i]
            mat4.multiply(m, projection, m)
        }
    }
    CPUTime.value = ((performance.now() - start) / 10).toFixed(2)
    console.timeEnd('cpu multiply x10')

    // papare gpu
    const device = await initWebGPU()
    const {pipeline, bindGroup, mvpBuffer} = await initPipeline(device, modelMatrix, projection)
    // papare a read buffer to map mvp back to js
    const readBuffer = device.createBuffer({
        size: modelMatrix.byteLength,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    })
    // run test x300
    const commandEncoder = device.createCommandEncoder()
    for(let i = 0; i < 300; i++){
        const computePass = commandEncoder.beginComputePass()
        computePass.setPipeline(pipeline)
        computePass.setBindGroup(0, bindGroup)
        computePass.dispatchWorkgroups(Math.ceil(NUM.value / 128))
        computePass.end()
    }
    // copy mvpBuffer will be done after all computePasses
    commandEncoder.copyBufferToBuffer(mvpBuffer, 0, readBuffer, 0, modelMatrix.byteLength)
    device.queue.submit([commandEncoder.finish()])
    // compute time by mapAsync
    console.time('gpu multiply x300')
    start = performance.now()
    // map readBuffer from GPU to CPU/JS
    await readBuffer.mapAsync(GPUMapMode.READ)
    GPUTime.value = ((performance.now() - start) / 300).toFixed(2)
    console.timeEnd('gpu multiply x300')
    // transfor buffer to JS object
    const copyArrayBuffer = readBuffer.getMappedRange()
    const result = new Float32Array(copyArrayBuffer)
    console.log(result)
    // unmap GPU buffer and release CPU/JS buffer
    readBuffer.unmap()
    disabled.value = false
}

const selectChange = (e) => {
    selectedKey.value = e.target.value
}

const runClick = () => {
    runAction()
}

</script>

<style lang="less" scoped>
.page {
    display: flex;
    flex-direction: column;
    align-items: center;
}
</style>
