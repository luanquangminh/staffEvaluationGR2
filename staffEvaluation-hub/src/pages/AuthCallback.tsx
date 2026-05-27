import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthFromTokens } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        const messages: Record<string, string> = {
          invalid_domain: 'Email không thuộc tổ chức. Vui lòng sử dụng tài khoản Outlook của tổ chức.',
          server_error: 'Lỗi máy chủ. Vui lòng thử lại.',
          no_code: 'Không nhận được mã xác thực.',
        };
        if (!cancelled) setError(messages[errorParam] || `Lỗi đăng nhập: ${errorParam}`);
        return;
      }

      if (!code) {
        if (!cancelled) setError('Không có mã xác thực.');
        return;
      }

      try {
        const data = await api.post<{
          accessToken: string;
          refreshToken: string;
        }>('/auth/microsoft/token', { code });

        if (cancelled) return;
        await setAuthFromTokens(data.accessToken, data.refreshToken);
        toast.success('Đăng nhập Microsoft thành công!');
        navigate('/dashboard', { replace: true });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Lỗi xác thực');
      }
    };

    handleCallback();
    return () => { cancelled = true; };
  }, [searchParams, navigate, setAuthFromTokens]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-destructive font-medium">{error}</p>
            <a href="/auth" className="text-primary underline text-sm">
              Quay lại trang đăng nhập
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Đang xử lý đăng nhập...</p>
      </div>
    </div>
  );
}
