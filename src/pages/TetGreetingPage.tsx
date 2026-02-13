import { Link } from 'react-router-dom';

export default function TetGreetingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-yellow-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-red-100 bg-white/80 p-8 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold tracking-wide text-red-700">
            KING APP
          </p>

          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
            Chúc mừng năm mới — An khang, thịnh vượng
          </h1>

          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Chúc Vuong và gia đình một năm mới nhiều sức khỏe, nhiều niềm vui,
            công việc hanh thông và tiền vào như nước.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Đăng nhập
            </Link>

            <a
              href="https://github.com/mnking/king-app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Xem source
            </a>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-500">
            Tip: Trang này là landing page mặc định. Các màn khác yêu cầu đăng nhập.
          </div>
        </div>
      </div>
    </div>
  );
}
