/**
 * CalculatorPageMobile
 * 
 * Calculadora optimizada para móviles con botones grandes y UI táctil.
 * Incluye: Precios + IVA, Márgenes, y cálculos básicos.
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
import { Calculator, Delete, Percent, Plus, Minus, X, Divide } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NexoHeaderMobile from "../components/mobile/NexoHeaderMobile";
import MobileBottomNav from "../components/MobileBottomNav";
import { motion } from "framer-motion";

const CalculatorPageMobile = () => {
  const { userId } = useParams<{ userId: string }>();
  
  // Basic Calculator State
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  // Price + IVA Calculator State
  const [price, setPrice] = useState("");
  const [ivaRate, setIvaRate] = useState("21");
  const [priceResult, setPriceResult] = useState<{ base: number; iva: number; total: number } | null>(null);

  // Margin Calculator State
  const [cost, setCost] = useState("");
  const [margin, setMargin] = useState("");
  const [marginResult, setMarginResult] = useState<{ sellingPrice: number; profit: number } | null>(null);

  // Basic Calculator Functions
  const handleNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleOperation = (op: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const result = calculate();
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForNewValue(true);
    setOperation(op);
  };

  const calculate = (): number => {
    const inputValue = parseFloat(display);
    if (previousValue === null || !operation) return inputValue;

    switch (operation) {
      case "+":
        return previousValue + inputValue;
      case "-":
        return previousValue - inputValue;
      case "×":
        return previousValue * inputValue;
      case "÷":
        return previousValue / inputValue;
      default:
        return inputValue;
    }
  };

  const handleEquals = () => {
    if (previousValue !== null && operation) {
      const result = calculate();
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  };

  const handleDecimal = () => {
    if (waitingForNewValue) {
      setDisplay("0.");
      setWaitingForNewValue(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  // Price + IVA Calculator
  const calculatePriceWithIVA = () => {
    const priceValue = parseFloat(price);
    const ivaValue = parseFloat(ivaRate);
    
    if (isNaN(priceValue) || priceValue <= 0) {
      setPriceResult(null);
      return;
    }

    const base = priceValue;
    const iva = (base * ivaValue) / 100;
    const total = base + iva;

    setPriceResult({ base, iva, total });
  };

  // Margin Calculator
  const calculateMargin = () => {
    const costValue = parseFloat(cost);
    const marginValue = parseFloat(margin);
    
    if (isNaN(costValue) || costValue <= 0 || isNaN(marginValue) || marginValue < 0 || marginValue > 100) {
      setMarginResult(null);
      return;
    }

    const sellingPrice = costValue / (1 - marginValue / 100);
    const profit = sellingPrice - costValue;

    setMarginResult({ sellingPrice, profit });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <NexoHeaderMobile 
        title="Calculadora"
        userId={userId || ""}
        showBack={false}
      />

      <main className="p-3 space-y-3">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="text-xs">Básica</TabsTrigger>
            <TabsTrigger value="price" className="text-xs">Precio + IVA</TabsTrigger>
            <TabsTrigger value="margin" className="text-xs">Margen</TabsTrigger>
          </TabsList>

          {/* Basic Calculator */}
          <TabsContent value="basic" className="mt-3 space-y-3">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white">Calculadora</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Display */}
                <div className="bg-black/20 rounded-lg p-4 text-right">
                  <div className="text-2xl font-semibold text-white font-mono overflow-x-auto">
                    {display}
                  </div>
                </div>

                {/* Buttons Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {/* Row 1 */}
                  <Button
                    onClick={handleClear}
                    className="h-14 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-base font-medium"
                  >
                    C
                  </Button>
                  <Button
                    onClick={() => handleOperation("÷")}
                    className="h-14 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-base font-medium"
                  >
                    <Divide className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => handleOperation("×")}
                    className="h-14 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-base font-medium"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => handleOperation("-")}
                    className="h-14 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-base font-medium"
                  >
                    <Minus className="w-5 h-5" />
                  </Button>

                  {/* Row 2 */}
                  <Button
                    onClick={() => handleNumber("7")}
                    className="h-14 bg-white/5 hover:bg-white/10 text-white text-base font-medium"
                  >
                    7
                  </Button>
                  <Button
                    onClick={() => handleNumber("8")}
                    className="h-14 bg-white/5 hover:bg-white/10 text-white text-base font-medium"
                  >
                    8
                  </Button>
                  <Button
                    onClick={() => handleNumber("9")}
                    className="h-14 bg-white/5 hover:bg-white/10 text-white text-base font-medium"
                  >
                    9
                  </Button>
                  <Button
                    onClick={() => handleOperation("+")}
                    className="h-14 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-base font-medium row-span-2"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>

                  {/* Row 3 */}
                  <Button
                    onClick={() => handleNumber("4")}
                    className="h-14 bg-white/5 hover:bg-white/10 text-white text-base font-medium"
                  >
                    4
                  </Button>
                  <Button
                    onClick={() => handleNumber("5")}
                    className="h-14 bg-white/5 hover:bg-white/10 text-white text-base font-medium"
                  >
                    5
                  </Button>
                  <Button
                    onClick={() => handleNumber("6")}
                    className="h-14 bg-white/5 hover:bg-white/10 text-white text-base font-medium"
                  >
                    6
                  </Button>

                  {/* Row 4 */}
                  <Button
                    onClick={() => handleNumber("1")}
                    className="h-14 bg-white/5 hover:bg-white/10 text-white text-base font-medium"
                  >
                    1
                  </Button>
                  <Button
                    onClick={() => handleNumber("2")}
                    className="h-14 bg-white/5 hover:bg-white/10 text-white text-base font-medium"
                  >
                    2
                  </Button>
                  <Button
                    onClick={() => handleNumber("3")}
                    className="h-14 bg-white/5 hover:bg-white/10 text-white text-base font-medium"
                  >
                    3
                  </Button>
                  <Button
                    onClick={handleEquals}
                    className="h-14 bg-orange-500 hover:bg-orange-600 text-white text-base font-medium row-span-2"
                  >
                    =
                  </Button>

                  {/* Row 5 */}
                  <Button
                    onClick={() => handleNumber("0")}
                    className="h-14 bg-white/5 hover:bg-white/10 text-white text-base font-medium col-span-2"
                  >
                    0
                  </Button>
                  <Button
                    onClick={handleDecimal}
                    className="h-14 bg-white/5 hover:bg-white/10 text-white text-base font-medium"
                  >
                    .
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Price + IVA Calculator */}
          <TabsContent value="price" className="mt-3 space-y-3">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white">Precio + IVA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs text-white/60">Precio base (sin IVA)</label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    onBlur={calculatePriceWithIVA}
                    placeholder="0.00"
                    className="bg-white/5 border-white/10 text-white text-base h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-white/60">% IVA</label>
                  <Input
                    type="number"
                    value={ivaRate}
                    onChange={(e) => setIvaRate(e.target.value)}
                    onBlur={calculatePriceWithIVA}
                    className="bg-white/5 border-white/10 text-white text-base h-12"
                  />
                </div>

                <Button
                  onClick={calculatePriceWithIVA}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-sm font-medium"
                >
                  Calcular
                </Button>

                {priceResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-white/5 rounded-lg space-y-2 border border-white/10"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Base:</span>
                      <span className="text-white font-medium">{formatCurrency(priceResult.base)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">IVA:</span>
                      <span className="text-white font-medium">{formatCurrency(priceResult.iva)}</span>
                    </div>
                    <div className="flex justify-between text-base pt-2 border-t border-white/10">
                      <span className="text-white font-semibold">Total:</span>
                      <span className="text-white font-bold">{formatCurrency(priceResult.total)}</span>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Margin Calculator */}
          <TabsContent value="margin" className="mt-3 space-y-3">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white">Cálculo de Margen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs text-white/60">Coste</label>
                  <Input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    onBlur={calculateMargin}
                    placeholder="0.00"
                    className="bg-white/5 border-white/10 text-white text-base h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-white/60">% Margen deseado</label>
                  <Input
                    type="number"
                    value={margin}
                    onChange={(e) => setMargin(e.target.value)}
                    onBlur={calculateMargin}
                    placeholder="0"
                    className="bg-white/5 border-white/10 text-white text-base h-12"
                  />
                </div>

                <Button
                  onClick={calculateMargin}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-sm font-medium"
                >
                  Calcular
                </Button>

                {marginResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-white/5 rounded-lg space-y-2 border border-white/10"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Precio de venta:</span>
                      <span className="text-white font-medium">{formatCurrency(marginResult.sellingPrice)}</span>
                    </div>
                    <div className="flex justify-between text-base pt-2 border-t border-white/10">
                      <span className="text-white font-semibold">Beneficio:</span>
                      <span className="text-white font-bold">{formatCurrency(marginResult.profit)}</span>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

export default CalculatorPageMobile;
