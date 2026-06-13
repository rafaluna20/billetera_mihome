"use server"

import { cookies } from "next/headers"
import { adminDb as db } from "@/lib/firebase/adminConfig"
import { getWalletAccount } from "./wallet"

export type InvestmentContract = {
  id: string
  name: string
  status: "active" | "completed" | "pending"
  capital: number
  roi_percentage: number
  start_date: string
  end_date: string
  accrued_gains: number
}

export type InvestmentSummary = {
  total_capital: number
  active_capital: number
  total_gains: number
  monthly_gains: number
  next_payment_amount: number
  next_payment_date: string
  platform_balance: number
  active_projects: number
  contracts: InvestmentContract[]
}

export async function getInvestmentSummary(): Promise<InvestmentSummary> {
  const cookieStore = await cookies();
  const userEmail = cookieStore.get("wallet_user_email")?.value;
  
  if (!userEmail) {
      return {
        total_capital: 0,
        active_capital: 0,
        total_gains: 0,
        monthly_gains: 0,
        next_payment_amount: 0,
        next_payment_date: `Desconectado (Inicia sesión de nuevo)`,
        platform_balance: 0,
        active_projects: 0,
        contracts: []
      };
    }

  try {
    let userUid = null;
    let platformBalance = 0;
    
    // 1. Fetch user by email
    const usersSnapshot = await db.collection("usuarios").where("email", "==", userEmail).get();
    
    if (!usersSnapshot.empty) {
      userUid = usersSnapshot.docs[0].id;
      platformBalance = usersSnapshot.docs[0].data().saldo || 0;
    } else {
      const usersEnSnapshot = await db.collection("users").where("email", "==", userEmail).get();
      if (!usersEnSnapshot.empty) {
        userUid = usersEnSnapshot.docs[0].id;
        platformBalance = usersEnSnapshot.docs[0].data().saldo || 0;
      }
    }

    if (!userUid) {
      console.warn("Usuario no encontrado en Firebase Inversiones para el email:", userEmail);
      return {
        total_capital: 0,
        active_capital: 0,
        total_gains: 0,
        monthly_gains: 0,
        next_payment_amount: 0,
        next_payment_date: `Email no en Firebase: ${userEmail}`,
        platform_balance: 0,
        active_projects: 0,
        contracts: []
      };
    }

    // 2. Fetch investments from productos.inversores[] (estructura legacy de la plataforma)
    const productosSnapshot = await db.collection("productos").get();

    let totalCapital = 0;
    let activeCapital = 0;
    let totalGains = 0;
    const contracts: InvestmentContract[] = [];

    for (const doc of productosSnapshot.docs) {
      const producto = doc.data();
      const inversores: any[] = producto.inversores || [];
      
      // Buscar si este usuario invirtió en este producto
      const miInversion = inversores.find((inv: any) => inv.usuarioId === userUid);
      
      if (!miInversion) continue; // No invirtió en este producto

      // Calcular monto invertido (cubos * precio / 100)
      const capitalTotalProyecto = Number(producto.precio || producto.monto || 0);
      const cubos = Number(miInversion.cubos || 0);
      const montoInvertido = (cubos * capitalTotalProyecto) / 100;
      const roiProyectado = Number(producto.roi || 15);

      totalCapital += montoInvertido;

      // Determinar estado
      const isActive = producto.estado === true;
      const isLiquidado = producto.distribucionEjecutada || producto.estado === false;

      // Solo el capital de proyectos activos suma al activeCapital
      if (isActive && !isLiquidado) {
        activeCapital += montoInvertido;
      }

      // Calcular ganancias reales si el proyecto fue liquidado
      let gananciaReal = 0;
      if (isLiquidado) {
        const valorVentaTotal = Number(producto.monto || producto.precio || 0);
        const capitalOriginal = Number(producto.precio || 0);
        const totalCubosVendidos = inversores.reduce((sum: number, inv: any) => sum + Number(inv.cubos || 0), 0) || 100;
        const porcentaje = totalCubosVendidos > 0 ? (cubos / totalCubosVendidos) : 0;
        const gastos = Number(producto.totalGastos || 0);
        const gananciaProyecto = (valorVentaTotal - capitalOriginal) - gastos;
        gananciaReal = gananciaProyecto * porcentaje;
      }
      totalGains += gananciaReal;

      contracts.push({
        id: doc.id,
        name: producto.nombre || "Proyecto de Inversión",
        status: isLiquidado ? 'completed' : (isActive ? 'active' : 'pending'),
        capital: montoInvertido,
        roi_percentage: roiProyectado,
        start_date: miInversion.fecha ? new Date(miInversion.fecha).toISOString().split('T')[0] : "-",
        end_date: "-",
        accrued_gains: gananciaReal
      });
    }

    // También buscar en la colección 'inversiones' (nueva estructura bifásica)
    const invSnapshot = await db.collection("inversiones").where("usuarioId", "==", userUid).get();
    for (const doc of invSnapshot.docs) {
      const data = doc.data();
      // Evitar duplicados si ya fue contado desde productos
      if (contracts.some(c => c.id === data.proyectoId)) continue;

      const capital = data.montoInvertido || 0;
      const isLiquidado = data.estadoProyecto === 'finalizado';
      const isActive = data.confirmada && !isLiquidado;
      
      if (data.confirmada) {
        totalCapital += capital;
        if (isActive) {
          activeCapital += capital;
        }
      }
      totalGains += data.gananciaReal || 0;

      let projectName = "Proyecto de Inversión";
      if (data.proyectoId) {
        const projDoc = await db.collection("productos").doc(data.proyectoId).get();
        if (projDoc.exists) projectName = projDoc.data()?.nombre || projectName;
      }

      contracts.push({
        id: doc.id,
        name: projectName,
        status: !data.confirmada ? 'pending' : (isLiquidado ? 'completed' : 'active'),
        capital: capital,
        roi_percentage: data.roiProyectado || 0,
        start_date: new Date(data.fechaInversion || data.createdAt).toISOString().split('T')[0],
        end_date: "-",
        accrued_gains: data.gananciaReal || 0
      });
    }

    return {
      total_capital: totalCapital,
      active_capital: activeCapital,
      total_gains: totalGains,
      monthly_gains: totalGains > 0 ? totalGains / 12 : 0,
      next_payment_amount: 0,
      next_payment_date: contracts.length > 0 ? "Por definir" : "Sin contratos activos",
      platform_balance: platformBalance,
      active_projects: contracts.filter(c => c.status === 'active').length,
      contracts: contracts
    };
  } catch (err: any) {
    console.error("Error fetching from Firebase:", err);
    return {
      total_capital: 0,
      active_capital: 0,
      total_gains: 0,
      monthly_gains: 0,
      next_payment_amount: 0,
      next_payment_date: `Error de conexión: ${err?.message || err}`,
      platform_balance: 0,
      active_projects: 0,
      contracts: []
    };
  }
}

export async function rechargeInvestment(amount: number): Promise<{ success: boolean, reference: string, newBalance?: number, error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("wallet_token")?.value;
  const userEmail = cookieStore.get("wallet_user_email")?.value;

  if (!token || !userEmail) {
    return { success: false, reference: "", error: "No autenticado. Inicia sesión de nuevo." };
  }

  try {
    // ── PASO 1: Obtener el UID de Firebase del usuario ──
    let firebaseUid: string | null = null;

    const usersSnapshot = await db.collection("usuarios").where("email", "==", userEmail).get();
    if (!usersSnapshot.empty) {
      firebaseUid = usersSnapshot.docs[0].id;
    } else {
      const usersEnSnapshot = await db.collection("users").where("email", "==", userEmail).get();
      if (!usersEnSnapshot.empty) {
        firebaseUid = usersEnSnapshot.docs[0].id;
      }
    }

    if (!firebaseUid) {
      return { success: false, reference: "", error: "Tu cuenta no está vinculada a la plataforma de inversiones." };
    }

    // ── PASO 2: Debitar saldo de Odoo via /api/wallet/platform-load ──
    const { fetchFromOdoo } = await import("@/lib/api");

    const odooResponse = await fetchFromOdoo("/api/wallet/platform-load", {
      method: "POST",
      token,
      body: JSON.stringify({
        params: {
          amount,
          firebase_uid: firebaseUid,
          platform: "inversiones_pro",
        }
      })
    });

    const odooResult = odooResponse.result;

    if (!odooResult || !odooResult.success) {
      return {
        success: false,
        reference: "",
        error: odooResult?.error || "Error al debitar saldo de la billetera."
      };
    }

    const transactionId = odooResult.transaction_id; // Ej: "TRN-20260600076"
    const newOdooBalance = odooResult.new_balance;

    // ── PASO 3: Acreditar saldo en Firebase (usuarios.saldo) ──
    const { FieldValue } = await import("firebase-admin/firestore");

    // Determinar la colección correcta
    const userCollection = usersSnapshot.empty ? "users" : "usuarios";
    
    await db.collection(userCollection).doc(firebaseUid).update({
      saldo: FieldValue.increment(amount)
    });

    // ── PASO 4: Crear registro en plataforma_cargas (historial) ──
    await db.collection("plataforma_cargas").add({
      firebase_uid: firebaseUid,
      amount_credited: amount,
      odoo_transaction_id: transactionId,
      source: "billetera_odoo",
      fecha: new Date(),
      status: "completed",
      email: userEmail,
    });

    return {
      success: true,
      reference: transactionId,
      newBalance: newOdooBalance,
    };

  } catch (err: any) {
    console.error("Error en rechargeInvestment:", err);
    return {
      success: false,
      reference: "",
      error: err?.message || "Error inesperado al procesar la recarga."
    };
  }
}
