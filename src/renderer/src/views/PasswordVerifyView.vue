<!-- 主密码验证视图（safeStorage 不可用时） -->
<template>
  <div class="password-verify-container">
    <n-card class="password-card" :bordered="true">
      <template #header>
        <div class="header-section">
          <h1 class="title">🔐 验证主密码</h1>
          <n-text depth="3" style="font-size: 14px;">
            请输入主密码以解锁应用
          </n-text>
        </div>
      </template>

      <n-form
        ref="formRef"
        :model="form"
        :rules="rules"
        @submit.prevent="handleSubmit"
      >
        <n-form-item path="password" label="主密码">
          <n-input
            v-model:value="form.password"
            type="password"
            placeholder="请输入主密码"
            show-password-on="mousedown"
            :disabled="loading"
            size="large"
            @keyup.enter="handleSubmit"
          />
        </n-form-item>

        <n-alert v-if="errorMessage" type="error" :bordered="false" style="margin-bottom: 24px;">
          {{ errorMessage }}
        </n-alert>

        <n-button
          type="primary"
          size="large"
          block
          :loading="loading"
          @click="handleSubmit"
        >
          验证并继续
        </n-button>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NText,
  NAlert,
} from 'naive-ui';
import type { FormInst, FormRules } from 'naive-ui';

const router = useRouter();
const message = useMessage();
const formRef = ref<FormInst | null>(null);
const loading = ref(false);
const errorMessage = ref('');

const form = ref({
  password: '',
});

const rules: FormRules = {
  password: [
    { required: true, message: '请输入主密码', trigger: 'blur' },
  ],
};

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
    const result = await window.electronAPI.password.verify(form.value.password);

    if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
      const error = result as any;
      errorMessage.value = error.message || '验证失败';
      return;
    }

    if (result && typeof result === 'object' && 'success' in result && result.success) {
      if (result.verified) {
        message.success('验证成功');
        // 跳转到首页
        router.push('/');
      } else {
        errorMessage.value = '密码验证失败，请重试';
      }
    } else {
      errorMessage.value = '验证失败，请重试';
    }
  } catch (error: any) {
    errorMessage.value = error.message || '验证失败';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.password-verify-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.password-card {
  width: 100%;
  max-width: 500px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.header-section {
  text-align: center;
}

.title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}
</style>
