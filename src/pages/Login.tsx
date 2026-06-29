import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
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
        </Card>
      </motion.div>
    </div>
  );
};
