import { getWalletAccount } from "@/lib/actions/wallet"
import { redirect } from "next/navigation"
import RechargeClient from "./RechargeClient"

export default async function RechargeInvestmentScreen() {
  const account = await getWalletAccount()
  if (!account) redirect("/")

  return (
    <RechargeClient
      walletBalance={account.balance ?? 0}
      accountNumber={account.number || ""}
    />
  )
}
