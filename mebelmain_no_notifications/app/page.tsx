"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Header } from "@/components/header"
import { TovarlarModule } from "@/components/tovarlar/tovarlar-module"
import { ZakazlarModule } from "@/components/zakazlar/zakazlar-module"
import { MebelModule } from "@/components/mebel/mebel-module"
import { KronkaModule } from "@/components/kronka/kronka-module"
import { ArxivModule } from "@/components/arxiv/arxiv-module"
import { AdminModule } from "@/components/admin/admin-module"
import { HisobotlarModule } from "@/components/hisobotlar/hisobotlar-module"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("tovarlar")

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case "tovarlar":
        return "Tovarlar"
      case "zakazlar":
        return "Zakazlar"
      case "mebel":
        return "Mebel"
      case "kronka":
        return "Kronka"
      case "hisobotlar":
        return "Hisobotlar"
      case "arxiv":
        return "Arxiv"
      case "sozlamalar":
        return "Sozlamalar"
      case "admin":
        return "Admin"
      default:
        return "Tovarlar"
    }
  }

  const getPageSubtitle = (tab: string) => {
    switch (tab) {
      case "tovarlar":
        return "Mahsulotlar va ombor holati boshqaruvi"
      case "zakazlar":
        return "Buyurtmalar boshqaruvi"
      case "mebel":
        return "Mebel ishlab chiqarish"
      case "kronka":
        return "Lenta ishlab chiqarish"
      case "hisobotlar":
        return "Statistika va hisobotlar"
      case "arxiv":
        return "Yakunlangan ishlar arxivi"
      case "sozlamalar":
        return "Tizim sozlamalari"
      case "admin":
        return "Administrator paneli"
      default:
        return "Mahsulotlar va ombor holati boshqaruvi"
    }
  }

  const Placeholder = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="glass-card rounded-2xl p-8 min-h-[600px] animate-fadeIn">
      <div className="flex items-center justify-center h-full">
        <div className="text-center animate-slideIn">
          <h3 className="text-2xl font-semibold text-foreground mb-4">{title}</h3>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case "tovarlar":
        return <TovarlarModule />
      case "zakazlar":
        return <ZakazlarModule />
      case "mebel":
        return <MebelModule />
      case "kronka":
        return <KronkaModule />
      case "hisobotlar":
        return <HisobotlarModule />
      case "arxiv":
        return <ArxivModule />
      case "admin":
        return <AdminModule />
      case "sozlamalar":
        return <Placeholder title="Sozlamalar" subtitle="Tizim sozlamalari bo'limi" />
      default:
        return <Placeholder title={`${getPageTitle(activeTab)} moduli`} subtitle={getPageSubtitle(activeTab)} />
    }
  }

  return (
    <div className="min-h-screen animate-fadeIn">
      <Header title={getPageTitle(activeTab)} subtitle={getPageSubtitle(activeTab)} />

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="container mx-auto px-6 pb-6">{renderContent()}</main>
    </div>
  )
}
