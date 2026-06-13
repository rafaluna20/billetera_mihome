import { getWalletAccount } from "@/lib/actions/wallet"
import { getInvestmentSummary } from "@/lib/actions/investments"
import { redirect } from "next/navigation"
import WithdrawClient from "./WithdrawClient"

export default async function WithdrawPage() {
  const [account, summary] = await Promise.all([
    getWalletAccount(),
    getInvestmentSummary(),
  ])

  if (!account) redirect("/")

  return (
    <WithdrawClient
      platformBalance={summary.platform_balance ?? 0}
      walletBalance={account.balance ?? 0}
      accountNumber={account.number || ""}
    />
  )
}
