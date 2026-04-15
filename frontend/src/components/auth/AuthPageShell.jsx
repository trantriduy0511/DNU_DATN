/**
 * Khung trang đăng nhập / đăng ký: nền campus, glassmorphism, tiêu đề DNU LEARNING HUB.
 */
const AuthPageShell = ({ children, cardClassName = '', wide = false, showLogo = true }) => {
  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col items-center justify-center px-4 py-10 md:py-14">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/auth-bg-gate.png)' }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/55 via-slate-900/45 to-slate-950/65" aria-hidden />
      <div className="absolute inset-0 backdrop-[blur(0.5px)]" aria-hidden />

      <div
        className={`relative z-10 w-full flex flex-col items-center ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      >
        {/* Tiêu đề phía trên card — theo mockup */}
        <p
          className="text-center text-white text-2xl md:text-3xl mb-2 drop-shadow-md"
          style={{ fontFamily: '"Dancing Script", cursive' }}
        >
          Chào mừng bạn đến với
        </p>
        <h1 className="text-center font-extrabold tracking-tight text-[#F26522] drop-shadow-lg text-3xl md:text-4xl mb-6 md:mb-8 [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
          DNU LEARNING HUB
        </h1>

        {showLogo && (
          <div className="mb-5 flex justify-center">
            <div className="rounded-full bg-white/95 p-2 shadow-xl ring-2 ring-white/50">
              <img
                src="/dainam-logo.png"
                alt="Đại học Đại Nam"
                className="h-16 w-16 md:h-20 md:w-20 object-contain"
              />
            </div>
          </div>
        )}

        {/* Glass card */}
        <div
          className={`w-full rounded-[1.75rem] border border-white/35 bg-white/18 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150 px-6 py-8 md:px-9 md:py-10 ${cardClassName}`}
        >
          {children}
        </div>

      </div>
    </div>
  );
};

export default AuthPageShell;
