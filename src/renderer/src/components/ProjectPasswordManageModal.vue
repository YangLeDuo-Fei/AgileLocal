<!-- 项目密码管理弹窗 - 苹果风格 -->
<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    :style="{ maxWidth: '500px', borderRadius: '16px' }"
    :title="projectHasPassword ? '更改项目密码' : '设置项目密码'"
    size="small"
  >
    <n-form
      ref="formRef"
      :model="form"
      :rules="rules"
      @submit.prevent="handleSubmit"
    >
      <n-form-item v-if="projectHasPassword" path="oldPassword" label="当前密码">
        <n-input
          v-model:value="form.oldPassword"
          type="password"
          placeholder="请输入当前密码"
          show-password-on="mousedown"
          :disabled="loading"
          size="large"
        />
      </n-form-item>

      <n-form-item path="password" :label="projectHasPassword ? '新密码' : '项目密码'">
        <n-input
          v-model:value="form.password"
          type="password"
          placeholder="请输入项目密码（至少6个字符）"
          show-password-on="mousedown"
          :disabled="loading"
          size="large"
        />
      </n-form-item>

      <n-form-item path="confirmPassword" label="确认密码">
        <n-input
          v-model:value="form.confirmPassword"
          type="password"
          placeholder="请再次输入密码"
          show-password-on="mousedown"
          :disabled="loading"
          size="large"
        />
      </n-form-item>

      <n-alert type="info" :bordered="false" style="margin-bottom: 16px;">
        <div style="font-size: 12px;">
          <div>• 密码至少 6 个字符</div>
          <div>• 密码丢失后无法恢复，请妥善保管</div>
        </div>
      </n-alert>

      <n-space justify="end">
        <n-button
          v-if="projectHasPassword"
          type="error"
          :disabled="loading"
          @click="handleRemovePassword"
        >
          移除密码
        </n-button>
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
          {{ projectHasPassword ? '更改密码' : '设置密码' }}
        </n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NAlert,
  NSpace,
} from 'naive-ui';
import type { FormInst, FormRules } from 'naive-ui';

const props = defineProps<{
  projectId: number;
  projectHasPassword: boolean;
  show: boolean;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  'success': [];
}>();

const message = useMessage();
const dialog = useDialog();
const formRef = ref<FormInst | null>(null);
const loading = ref(false);

const form = ref({
  oldPassword: '',
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
  oldPassword: props.projectHasPassword ? [
    { required: true, message: '请输入当前密码', trigger: 'blur' },
  ] : [],
  password: [
    { required: true, message: '请输入项目密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validatePasswordSame, trigger: 'blur' },
  ],
};

const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
});

// 当弹窗关闭时重置状态
watch(() => props.show, (newVal) => {
  if (!newVal) {
    form.value = {
      oldPassword: '',
      password: '',
      confirmPassword: '',
    };
  }
});

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  // 如果是要更改密码，先验证旧密码
  if (props.projectHasPassword && form.value.oldPassword) {
    loading.value = true;
    try {
      const verifyResult = await window.electronAPI.project.verifyPassword(
        props.projectId,
        form.value.oldPassword
      );

      if (verifyResult && typeof verifyResult === 'object' && 'isAppError' in verifyResult && verifyResult.isAppError) {
        message.error('当前密码验证失败');
        return;
      }

      if (!(verifyResult && typeof verifyResult === 'object' && 'success' in verifyResult && verifyResult.valid)) {
        message.error('当前密码错误');
        return;
      }
    } catch (error: any) {
      message.error(error.message || '验证当前密码失败');
      return;
    } finally {
      loading.value = false;
    }
  }

  // 设置新密码
  loading.value = true;
  try {
    const result = await window.electronAPI.project.setPassword(props.projectId, form.value.password);

    if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
      const error = result as any;
      message.error(error.message || '设置项目密码失败');
      return;
    }

    if (result && typeof result === 'object' && 'success' in result && result.success) {
      message.success(props.projectHasPassword ? '密码更改成功' : '项目密码设置成功');
      emit('success');
      visible.value = false;
    } else {
      message.error('设置项目密码失败');
    }
  } catch (error: any) {
    message.error(error.message || '设置项目密码失败');
  } finally {
    loading.value = false;
  }
};

const handleRemovePassword = () => {
  dialog.warning({
    title: '确认移除密码',
    content: '移除密码后，任何人都可以访问此项目。确定要继续吗？',
    positiveText: '移除',
    negativeText: '取消',
    onPositiveClick: async () => {
      loading.value = true;
      try {
        const result = await window.electronAPI.project.removePassword(props.projectId);

        if (result && typeof result === 'object' && 'isAppError' in result && result.isAppError) {
          const error = result as any;
          message.error(error.message || '移除项目密码失败');
          return;
        }

        if (result && typeof result === 'object' && 'success' in result && result.success) {
          message.success('项目密码已移除');
          emit('success');
          visible.value = false;
        } else {
          message.error('移除项目密码失败');
        }
      } catch (error: any) {
        message.error(error.message || '移除项目密码失败');
      } finally {
        loading.value = false;
      }
    },
  });
};

const handleCancel = () => {
  visible.value = false;
};
</script>

<style scoped>
/* 苹果风格样式已由 Naive UI 处理 */
</style>

