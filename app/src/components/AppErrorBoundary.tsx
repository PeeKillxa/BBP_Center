import { Component, type ReactNode } from 'react'
import { resetDemo } from '../store/store'

/** The reset only replaces mock data; live balances remain on the server. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="mx-auto max-w-lg space-y-4 p-6" role="alert">
        <h1 className="text-2xl font-bold">เปิดหน้านี้ไม่สำเร็จ</h1>
        <p>ลองโหลดหน้าใหม่ หากข้อมูลสาธิตมีปัญหา สามารถรีเซ็ตข้อมูลสาธิตได้ ยอดเงินจริงจะไม่เปลี่ยน</p>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-xl bg-primary px-4 py-3 text-white" onClick={() => window.location.reload()}>โหลดหน้าใหม่</button>
          <button className="rounded-xl border border-line px-4 py-3" onClick={() => { resetDemo(); window.location.assign('/') }}>รีเซ็ตข้อมูลสาธิต</button>
        </div>
      </main>
    )
  }
}
