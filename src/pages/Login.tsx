import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { isDemoMode } from '../lib/firebase';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

// Zod Schema for validation
const authSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
});

type AuthFormValues = z.infer<typeof authSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: AuthFormValues) => {
    try {
      setIsSubmitting(true);
      await login(data.email, data.password);
      toast.success('Đăng nhập thành công! 👋');
      navigate('/dashboard');
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Thao tác thất bại. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill demo credentials
  const handleAutofillDemo = () => {
    setValue('email', 'demo@worklog.app');
    setValue('password', 'demo123');
    toast.success('Đã điền tài khoản demo! ✨');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-brandBg-dark dark:via-slate-900/60 dark:to-slate-950 p-4 transition-colors duration-300">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary-light/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="w-full max-w-[440px] z-10"
      >
        <Card glass className="p-8 md:p-10 text-center flex flex-col gap-6">
          
          {/* Logo Header */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="w-16 h-16 rounded-3xl bg-primary-soft flex items-center justify-center text-3xl shadow-soft"
            >
              🕒
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mt-2">
              Chào mừng trở lại
            </h1>
            <p className="text-sm text-brandText-secondaryLight dark:text-brandText-secondaryDark">
              Ghi lại thời gian làm việc mỗi ngày một cách nhẹ nhàng
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4.5">
            <Input
              {...register('email')}
              label="Email đăng nhập"
              placeholder="nhanvien@congty.com"
              error={errors.email?.message}
              leftIcon={<Mail size={18} />}
            />

            <Input
              {...register('password')}
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              error={errors.password?.message}
              leftIcon={<Lock size={18} />}
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full mt-2 py-3"
            >
              Đăng nhập
            </Button>
          </form>

          {/* Demo Mode Guide Panel */}
          {isDemoMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-4 p-4 rounded-2xl bg-primary-soft/50 dark:bg-primary-soft/20 border border-primary/10 text-left flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Chế độ Demo hoạt động
                </span>
                <span className="text-[10px] bg-primary text-white font-semibold px-2 py-0.5 rounded-full">
                  Local Storage
                </span>
              </div>
              <p className="text-xs text-brandText-secondaryLight dark:text-brandText-secondaryDark leading-relaxed">
                Hệ thống đang chạy không có Firebase. Đăng nhập bằng tài khoản thử nghiệm sau để xem 25 ngày chấm công:
              </p>
              <div className="text-xs font-mono text-gray-800 dark:text-gray-300 bg-white/60 dark:bg-slate-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-850 flex flex-col gap-1">
                <div>Email: <span className="font-semibold text-primary">demo@worklog.app</span></div>
                <div>Pass: <span className="font-semibold text-primary">demo123</span></div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full text-xs py-2 mt-1"
                onClick={handleAutofillDemo}
              >
                Đăng nhập nhanh (Auto-fill)
              </Button>
            </motion.div>
          )}

          {/* Footer note */}
          <div className="text-[11px] text-brandText-secondaryLight dark:text-brandText-secondaryDark leading-relaxed mt-2">
            Đăng nhập bằng tài khoản đã được tạo sẵn trên Firebase.
          </div>

        </Card>
      </motion.div>
    </div>
  );
};
