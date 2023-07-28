<!--
 * @Author: matiastang
 * @Date: 2023-07-27 17:44:23
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-28 10:10:13
 * @FilePath: /auto-i18n/src/views/home/TestHome.vue
 * @Description: 
-->
<template>
    <div class="page">
        <Header></Header>
        <div>{{ text }}</div>
    </div>
</template>
<script lang="ts">
// import { inject } from 'vue'
import { defineComponent, ref, onBeforeUnmount, onMounted, watch } from 'vue'
import Header from '../Components/Header/Header.vue'

const TestHome = defineComponent({
    props: {
        info: {
            type: Object,
            default: () => {
                return {}
            }
        }
    },
    components: {
        Header
    },
    setup(props) {
        const text = ref(0)
        const request = () => {
            console.log('======')
        }

        watch(text, (newValue, oldValue) => {
            console.log(`newValue=${newValue}, oldValue=${oldValue}`)
        }, {
            immediate: true,
            deep: true
        })

        watch(
            () => props.info.code,
            (newValue, oldValue) => {
                console.log(`<<<<<<<<<<<newValue=${newValue}, oldValue=${oldValue}`)
            },
            {
                immediate: true,
                deep: true
            }
        )

        onMounted(() => {
            console.log('---onMounted---')
            request()
        })

        onBeforeUnmount(() => {
            console.log('---onBeforeUnmount---')
        })
        return {
            text,
        }
    }
})

export default TestHome

</script>

<style lang="less" scoped>
.page {
    box-sizing: border-box;
    width: 100vw;
    height: calc(100vh - 60px);
    padding: 32px;
    background: white;

    .title {
        display: flex;
        align-items: center;

        .item {
            margin: 0px 16px;
        }
    }
}
</style>