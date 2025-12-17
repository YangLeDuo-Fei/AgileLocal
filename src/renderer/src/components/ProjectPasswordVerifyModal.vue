<!-- 项目密码验证弹窗 - 苹果风格 -->
<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    :close-on-esc="false"
    preset="card"
    :style="{ maxWidth: '480px', borderRadius: '16px' }"
    title="🔒 项目密码验证"
    size="small"
  >
    <n-form
      ref="formRef"
      :model="form"
      :rules="rules"
      @submit.prevent="handleSubmit"
    >
      <n-form-item path="password" label="项目密码">
        <n-input
          v-model:value="form.password"
          type="password"
          placeholder="请输入项目密码"
          show-password-on="mousedown"
          :disabled="loading"
          size="large"
          @keyup.enter="handleSubmit"
        />
      </n-form-item>

      <n-alert v-if="errorMessage" type="error" :bordered="false" style="margin-bottom: 16px;">
        {{ errorMessage }}
        <template v-if="retryCount > 0 && retryCount < MAX_RETRIES">
          <div style="margin-top: 8px; font-size: 12px; color: rgba(255, 77, 79, 0.8);">
            剩余尝试次数：{{ MAX_RETRIES - retryCount }}
          </div>
        </template>
      </n-alert>

      <n-text depth="3" style="font-size: 12px; display: block; margin-bottom: 16px;">
        此项目已设置密码保护，请输入密码以访问。
      </n-text>

      <n-space justify="end">
        <n-button
          :disabled="loading"
          @click="handleCancel"
        >
          取消
        </n-button>
        <n-button
          type="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          验证
        </n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useMessage } from 'naive-ui';
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NText,
  NAlert,
  NSpace,
} from 'naive-ui';
import type { FormInst, FormRules } from 'naive-ui';

const props = defineProps<{
  projectId: number;
  show: boolean;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  'verified': [];
  'cancel': [];
}>();

const message = useMessage();
const formRef = ref<FormInst | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const retryCount = ref(0);
const MAX_RETRIES = 3;

const form = ref({
  password: '',
});

const rules: FormRules = {
  password: [
    { required: true, message: '请输入项目密码', trigger: 'blur' },
  ],
};

const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
});

// 当弹窗关闭时重置状态
watch(() => props.show, (newVal) => {
  if (!newVal) {
    form.value.password = '';
    errorMessage.value = '';
    retryCount.value = 0;
  }
});

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const result = await window.electronAPI.project.verifyPassword(props.projectId, form.value.password);

    if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
      const error = result as any;
      retryCount.value++;
      if (retryCount.value >= MAX_RETRIES) {
        errorMessage.value = `密码验证失败次数过多（${MAX_RETRIES}次）`;
        message.error('验证失败次数过多');
      } else {
        errorMessage.value = error.message || `密码错误（剩余尝试次数：${MAX_RETRIES - retryCount.value}）`;
        form.value.password = '';
      }
      return;
    }

    if (result && typeof result === 'object' && 'success' in result && result.success) {
      if (result.valid) {
        message.success('验证成功');
        retryCount.value = 0;
        emit('verified');
        visible.value = false;
      } else {
        retryCount.value++;
        if (retryCount.value >= MAX_RETRIES) {
          errorMessage.value = `密码验证失败次数过多（${MAX_RETRIES}次）`;
          message.error('验证失败次数过多');
        } else {
          errorMessage.value = `密码错误（剩余尝试次数：${MAX_RETRIES - retryCount.value}）`;
          form.value.password = '';
        }
      }
    } else {
      retryCount.value++;
      if (retryCount.value >= MAX_RETRIES) {
        errorMessage.value = `密码验证失败次数过多（${MAX_RETRIES}次）`;
        message.error('验证失败次数过多');
      } else {
        errorMessage.value = `验证失败（剩余尝试次数：${MAX_RETRIES - retryCount.value}）`;
        form.value.password = '';
      }
    }
  } catch (error: any) {
    retryCount.value++;
    if (retryCount.value >= MAX_RETRIES) {
      errorMessage.value = `密码验证失败次数过多（${MAX_RETRIES}次）`;
      message.error('验证失败次数过多');
    } else {
      errorMessage.value = error.message || `验证失败（剩余尝试次数：${MAX_RETRIES - retryCount.value}）`;
      form.value.password = '';
    }
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  emit('cancel');
  visible.value = false;
};
</script>


<style scoped>
/* 苹果风格样式已由 Naive UI 处理 */
</style>

