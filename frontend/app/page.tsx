import Link from "next/link";
import { ArrowRight, FileText, MessageSquareDot, History, User } from "lucide-react";

export default function Home() {
  const tiles = [
    {
      href: "/write",
      icon: FileText,
      title: "새 자소서 작성",
      desc: "회사·직무·항목 입력하면 모든 전문가가 동시 검토하여 합성된 결과를 만듭니다.",
    },
    {
      href: "/review",
      icon: MessageSquareDot,
      title: "초안 검토 받기",
      desc: "이미 쓴 자소서·포트폴리오를 붙여넣고 전문가별 피드백 + 통합 수정안 받기.",
    },
    {
      href: "/history",
      icon: History,
      title: "내 자소서 히스토리",
      desc: "회사별·항목별로 누적된 자소서 버전 비교.",
    },
    {
      href: "/profile",
      icon: User,
      title: "내 프로필",
      desc: "고정 프로필과 STAR 경험을 한 번 정리하면 매번 입력할 필요가 없습니다.",
    },
  ];

  return (
    <div className="space-y-12">
      <section className="space-y-3 pt-4">
        <p className="text-xs tracking-widest text-[var(--muted)] uppercase">
          전문가 페르소나 × LLM 개발자 전환 전략
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          한 명의 멘토가 아니라,
          <br />
          <span className="text-[var(--muted)]">
            여러 전문가의 의견을 동시에 받는 자소서
          </span>
        </h1>
        <p className="text-[15px] text-[var(--muted)] max-w-2xl leading-relaxed">
          취업사이다 · 면접왕 이형 · 강민혁의 컨설팅 스크립트 168개에서 학습된 페르소나가
          내 초안을 동시에 검토하고, 자료 보강·전문 용어·정량 결과까지 통합해
          하나의 자연스러운 글로 합성합니다.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tiles.map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="group surface p-6 hover:border-[var(--accent)] transition flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <Icon size={20} className="text-[var(--muted)]" />
              <ArrowRight
                size={18}
                className="text-[var(--muted)] group-hover:translate-x-1 transition"
              />
            </div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-[var(--muted)] leading-relaxed">{desc}</p>
          </Link>
        ))}
      </section>

      <section className="surface p-6 space-y-3">
        <div className="text-xs tracking-widest text-[var(--muted)] uppercase">
          작동 방식
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <li className="space-y-1">
            <div className="font-mono text-xs text-[var(--muted)]">01</div>
            <div className="font-medium">초안 입력</div>
            <div className="text-[var(--muted)] text-[13px]">
              직접 쓰거나, 시스템이 회사·직무 기반으로 생성
            </div>
          </li>
          <li className="space-y-1">
            <div className="font-mono text-xs text-[var(--muted)]">02</div>
            <div className="font-medium">병렬 피드백</div>
            <div className="text-[var(--muted)] text-[13px]">
              모든 페르소나가 동시에 점수·약점·보강 제안
            </div>
          </li>
          <li className="space-y-1">
            <div className="font-mono text-xs text-[var(--muted)]">03</div>
            <div className="font-medium">자료 보강 권장</div>
            <div className="text-[var(--muted)] text-[13px]">
              영상·다이어그램·전문 용어·수치가 빠지면 알려줌
            </div>
          </li>
          <li className="space-y-1">
            <div className="font-mono text-xs text-[var(--muted)]">04</div>
            <div className="font-medium">통합 수정안</div>
            <div className="text-[var(--muted)] text-[13px]">
              한 사람이 쓴 것처럼 자연스러운 최종안
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}
