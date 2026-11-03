import { Component, type ReactNode } from 'react'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="mx-auto max-w-lg space-y-4 p-6" role="alert"><h1 className="text-2xl font-bold">เปิดหน้านี้ไม่สำเร็จ</h1><p>กรุณาโหลดหน้าใหม่ หากเกิดปัญหาระหว่างชำระเงิน ให้ตรวจประวัติก่อนทำรายการซ้ำ</p><button className="rounded-xl bg-primary px-4 py-3 text-white" onClick={() => window.location.reload()}>โหลดหน้าใหม่</button></main>
  }
}
