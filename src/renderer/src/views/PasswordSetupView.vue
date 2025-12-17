<!-- 主密码设置视图（首次启动时） -->
<template>
  <div class="password-setup-container">
    <n-card class="password-card" :bordered="true">
      <template #header>
        <div class="header-section">
          <h1 class="title">🔐 设置主密码</h1>
          <n-text depth="3" style="font-size: 14px;">
            首次启动需要设置主密码以保护您的数据安全
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
            placeholder="请输入主密码（至少12个字符）"
            show-password-on="mousedown"
            :disabled="loading"
            size="large"
          />
        </n-form-item>

        <n-form-item path="confirmPassword" label="确认密码">
          <n-input
            v-model:value="form.confirmPassword"
            type="password"
            placeholder="请再次输入主密码"
            show-password-on="mousedown"
            :disabled="loading"
            size="large"
          />
        </n-form-item>

        <n-alert type="info" :bordered="false" style="margin-bottom: 24px;">
          <div style="font-size: 13px;">
            <div><strong>密码要求：</strong></div>
            <div>• 至少 12 个字符</div>
            <div>• 建议包含字母、数字和特殊字符</div>
            <div>• 请妥善保管，丢失后无法恢复</div>
          </div>
        </n-alert>

        <n-button
          type="primary"
          size="large"
          block
          :loading="loading"
          @click="handleSubmit"
        >
          设置主密码并继续
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

const form = ref({
  password: '',
  confirmPassword: '',
});

const validatePasswordSame = (_rule: any, value: string) => {
  if (value !== form.value.password) {
    return new Error('两次输入的密码不一致');
  }
  return true;
};

const rules: FormRules = {
  password: [
    { required: true, message: '请输入主密码', trigger: 'blur' },
    { min: 12, message: '密码长度至少12个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validatePasswordSame, trigger: 'blur' },
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
  try {
    const result = await window.electronAPI.password.set(form.value.password);

    if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
      const error = result as any;
      message.error(error.message || '设置主密码失败');
      return;
    }

    if (result && typeof result === 'object' && 'success' in result && result.success) {
      message.success('主密码设置成功');
      // 跳转到首页
      router.push('/');
    } else {
      message.error('设置主密码失败，请重试');
    }
  } catch (error: any) {
    message.error(error.message || '设置主密码失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.password-setup-container {
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




