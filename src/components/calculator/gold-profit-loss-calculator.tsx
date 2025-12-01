'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatCurrencyCompact, cn } from '@/lib/utils'
import {
  RETAILERS,
  PRODUCT_TYPES,
  PROVINCES,
  type Retailer,
  type ProductType,
  type Province,
} from '@/lib/constants'
import { useHistoricalPrices } from '@/lib/queries/use-historical-prices'
import { profitLossFormSchema, type ProfitLossFormData } from '@/lib/schemas/profit-loss'

interface CalculationResults {
  totalInvestment: number
  totalRevenue: number
  profitLoss: number
  profitLossPercent: number
  holdingDays: number
  apy: number
}

interface PriceState {
  buyPrice: number | null
  sellPrice: number | null
  buyPriceMode: 'auto' | 'manual'
  sellPriceMode: 'auto' | 'manual'
}

export function GoldProfitLossCalculator() {
  const [priceState, setPriceState] = useState<PriceState>({
    buyPrice: null,
    sellPrice: null,
    buyPriceMode: 'auto',
    sellPriceMode: 'auto',
  })
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [showResults, setShowResults] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ProfitLossFormData>({
    resolver: zodResolver(profitLossFormSchema),
    defaultValues: {
      province: 'TP. Hồ Chí Minh',
    },
  })

  // Watch form values for price fetching
  const buyDate = watch('buy_date')
  const sellDate = watch('sell_date')
  const retailer = watch('retailer')
  const productType = watch('product_type')
  const province = watch('province')
  const goldAmount = watch('gold_amount')

  // Fetch historical prices for buy date
  const {
    data: buyPriceData,
    isLoading: buyPriceLoading,
  } = useHistoricalPrices({
    startDate: buyDate ? new Date(buyDate) : new Date(),
    endDate: buyDate ? new Date(buyDate) : new Date(),
    retailer: retailer as Retailer,
    productType: productType as ProductType,
    province: (province || 'TP. Hồ Chí Minh') as Province,
    interval: 'daily',
  })

  // Fetch historical prices for sell date
  const {
    data: sellPriceData,
    isLoading: sellPriceLoading,
  } = useHistoricalPrices({
    startDate: sellDate ? new Date(sellDate) : new Date(),
    endDate: sellDate ? new Date(sellDate) : new Date(),
    retailer: retailer as Retailer,
    productType: productType as ProductType,
    province: (province || 'TP. Hồ Chí Minh') as Province,
    interval: 'daily',
  })

  // Fetch historical prices for chart (full date range)
  const {
    data: chartPriceData,
    isLoading: chartLoading,
  } = useHistoricalPrices({
    startDate: buyDate && showResults ? new Date(buyDate) : new Date(),
    endDate: sellDate && showResults ? new Date(sellDate) : new Date(),
    retailer: retailer as Retailer,
    productType: productType as ProductType,
    province: (province || 'TP. Hồ Chí Minh') as Province,
    interval: 'daily',
  })

  // Auto-update buy price when data is fetched
  useEffect(() => {
    if (
      priceState.buyPriceMode === 'auto' &&
      buyPriceData?.data &&
      buyPriceData.data.length > 0
    ) {
      // For buying gold, customer pays the retailer's sell_price
      const price = Number(buyPriceData.data[0].sell_price)
      setPriceState((prev) => ({ ...prev, buyPrice: price }))
    } else if (
      priceState.buyPriceMode === 'auto' &&
      buyPriceData?.data &&
      buyPriceData.data.length === 0
    ) {
      // No data found, switch to manual
      setPriceState((prev) => ({ ...prev, buyPriceMode: 'manual', buyPrice: null }))
    }
  }, [buyPriceData, priceState.buyPriceMode])

  // Auto-update sell price when data is fetched
  useEffect(() => {
    if (
      priceState.sellPriceMode === 'auto' &&
      sellPriceData?.data &&
      sellPriceData.data.length > 0
    ) {
      // For selling gold, customer receives the retailer's buy_price
      const price = Number(sellPriceData.data[0].buy_price)
      setPriceState((prev) => ({ ...prev, sellPrice: price }))
    } else if (
      priceState.sellPriceMode === 'auto' &&
      sellPriceData?.data &&
      sellPriceData.data.length === 0
    ) {
      // No data found, switch to manual
      setPriceState((prev) => ({ ...prev, sellPriceMode: 'manual', sellPrice: null }))
    }
  }, [sellPriceData, priceState.sellPriceMode])

  // Calculate results
  const calculateProfitLoss = (data: ProfitLossFormData) => {
    const { gold_amount, buy_date, sell_date } = data
    const { buyPrice, sellPrice } = priceState

    if (!buyPrice || !sellPrice) {
      alert('Vui lòng nhập giá mua và giá bán')
      return
    }

    // Calculate investment and revenue
    const totalInvestment = gold_amount * buyPrice
    const totalRevenue = gold_amount * sellPrice
    const profitLoss = totalRevenue - totalInvestment
    const profitLossPercent = (profitLoss / totalInvestment) * 100

    // Calculate holding period
    const buyDateTime = new Date(buy_date).getTime()
    const sellDateTime = new Date(sell_date).getTime()
    const holdingDays = Math.max(1, Math.floor((sellDateTime - buyDateTime) / 86400000))

    // Calculate APY (Annual Percentage Yield)
    const returnRate = profitLossPercent / 100
    const apy = (Math.pow(1 + returnRate, 365 / holdingDays) - 1) * 100

    setResults({
      totalInvestment,
      totalRevenue,
      profitLoss,
      profitLossPercent,
      holdingDays,
      apy,
    })
    setShowResults(true)
  }

  // Process chart data
  const chartData = useMemo(() => {
    if (!chartPriceData?.data || !results) return []

    return chartPriceData.data.map((item) => {
      // Use buy_price (what customer receives when selling)
      const dailyValue = goldAmount * Number(item.buy_price)
      const dailyProfitLoss = dailyValue - results.totalInvestment

      return {
        date: item.created_at,
        'Giá Trị': dailyValue,
        'Vốn Đầu Tư': results.totalInvestment,
      }
    })
  }, [chartPriceData, results, goldAmount])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM', { locale: vi })
    } catch {
      return dateString
    }
  }

  const formatPrice = (price: number) => {
    return formatCurrencyCompact(price)
  }

  const onSubmit = (data: ProfitLossFormData) => {
    calculateProfitLoss(data)
  }

  return (
    <div className="space-y-6">
      {/* Input Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Thông Tin Giao Dịch</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Row 1: Buy and Sell Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buy_date">Thời Gian Mua</Label>
                <Input
                  id="buy_date"
                  type="datetime-local"
                  {...register('buy_date')}
                  className="mt-1"
                />
                {errors.buy_date && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.buy_date.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="sell_date">Thời Gian Bán</Label>
                <Input
                  id="sell_date"
                  type="datetime-local"
                  {...register('sell_date')}
                  className="mt-1"
                />
                {errors.sell_date && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.sell_date.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Gold Amount and Retailer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gold_amount">Số Lượng Vàng (chỉ)</Label>
                <Input
                  id="gold_amount"
                  type="number"
                  step="0.001"
                  {...register('gold_amount', { valueAsNumber: true })}
                  className="mt-1"
                  placeholder="0.000"
                />
                {errors.gold_amount && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.gold_amount.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="retailer">Nhà Bán Lẻ</Label>
                <Controller
                  name="retailer"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Chọn nhà bán lẻ" />
                      </SelectTrigger>
                      <SelectContent>
                        {RETAILERS.map((retailer) => (
                          <SelectItem key={retailer} value={retailer}>
                            {retailer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.retailer && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.retailer.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Product Type and Province */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product_type">Loại Vàng</Label>
                <Controller
                  name="product_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Chọn loại vàng" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TYPES.map((product) => (
                          <SelectItem key={product.value} value={product.value}>
                            {product.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.product_type && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.product_type.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="province">Tỉnh/Thành Phố</Label>
                <Controller
                  name="province"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Chọn tỉnh/thành phố" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVINCES.map((province) => (
                          <SelectItem key={province} value={province}>
                            {province}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.province && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.province.message}
                  </p>
                )}
              </div>
            </div>

            {/* Buy Price Section */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>Giá Mua (VND/chỉ)</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={priceState.buyPriceMode === 'auto' ? 'default' : 'secondary'}>
                    {priceState.buyPriceMode === 'auto' ? 'Tự động' : 'Thủ công'}
                  </Badge>
                  {priceState.buyPrice && priceState.buyPriceMode === 'auto' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPriceState((prev) => ({
                          ...prev,
                          buyPriceMode: 'manual',
                        }))
                      }
                    >
                      Nhập thủ công
                    </Button>
                  )}
                </div>
              </div>
              {buyPriceLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : priceState.buyPriceMode === 'auto' && priceState.buyPrice ? (
                <Input
                  type="text"
                  value={formatCurrency(priceState.buyPrice)}
                  disabled
                  className="bg-muted"
                />
              ) : (
                <>
                  <Input
                    type="number"
                    step="1"
                    value={priceState.buyPrice || ''}
                    onChange={(e) =>
                      setPriceState((prev) => ({
                        ...prev,
                        buyPrice: parseFloat(e.target.value) || null,
                      }))
                    }
                    placeholder="Nhập giá mua"
                  />
                  {priceState.buyPriceMode === 'manual' &&
                    buyPriceData?.data?.length === 0 && (
                      <p className="text-sm text-amber-600">
                        ⚠️ Không tìm thấy dữ liệu giá lịch sử
                      </p>
                    )}
                </>
              )}
            </div>

            {/* Sell Price Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Giá Bán (VND/chỉ)</Label>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={priceState.sellPriceMode === 'auto' ? 'default' : 'secondary'}
                  >
                    {priceState.sellPriceMode === 'auto' ? 'Tự động' : 'Thủ công'}
                  </Badge>
                  {priceState.sellPrice && priceState.sellPriceMode === 'auto' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPriceState((prev) => ({
                          ...prev,
                          sellPriceMode: 'manual',
                        }))
                      }
                    >
                      Nhập thủ công
                    </Button>
                  )}
                </div>
              </div>
              {sellPriceLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : priceState.sellPriceMode === 'auto' && priceState.sellPrice ? (
                <Input
                  type="text"
                  value={formatCurrency(priceState.sellPrice)}
                  disabled
                  className="bg-muted"
                />
              ) : (
                <>
                  <Input
                    type="number"
                    step="1"
                    value={priceState.sellPrice || ''}
                    onChange={(e) =>
                      setPriceState((prev) => ({
                        ...prev,
                        sellPrice: parseFloat(e.target.value) || null,
                      }))
                    }
                    placeholder="Nhập giá bán"
                  />
                  {priceState.sellPriceMode === 'manual' &&
                    sellPriceData?.data?.length === 0 && (
                      <p className="text-sm text-amber-600">
                        ⚠️ Không tìm thấy dữ liệu giá lịch sử
                      </p>
                    )}
                </>
              )}
            </div>

            {/* Calculate Button */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full"
                disabled={
                  buyPriceLoading ||
                  sellPriceLoading ||
                  !priceState.buyPrice ||
                  !priceState.sellPrice
                }
              >
                Tính Toán
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Section */}
      {showResults && results && (
        <>
          {/* Summary Statistics Cards (2x3 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Profit/Loss */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lãi/Lỗ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    results.profitLoss > 0
                      ? 'success'
                      : results.profitLoss < 0
                      ? 'destructive'
                      : 'secondary'
                  }
                  className="text-lg font-bold px-3 py-1"
                >
                  {formatCurrency(results.profitLoss)}
                </Badge>
              </CardContent>
            </Card>

            {/* Percentage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Phần Trăm
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'text-2xl font-bold',
                    results.profitLoss > 0
                      ? 'text-green-600'
                      : results.profitLoss < 0
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                  )}
                >
                  {results.profitLossPercent > 0 ? '+' : ''}
                  {results.profitLossPercent.toFixed(2)}%
                </div>
              </CardContent>
            </Card>

            {/* Holding Days */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Số Ngày Nắm Giữ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.holdingDays} ngày</div>
              </CardContent>
            </Card>

            {/* APY */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  APY (Hàng Năm)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'text-2xl font-bold',
                    results.apy > 0
                      ? 'text-green-600'
                      : results.apy < 0
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                  )}
                >
                  {results.apy > 0 ? '+' : ''}
                  {results.apy.toFixed(2)}%
                </div>
                {results.holdingDays < 7 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ APY không ổn định với khoảng thời gian ngắn
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Total Investment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Vốn Đầu Tư
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(results.totalInvestment)}
                </div>
              </CardContent>
            </Card>

            {/* Total Revenue */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Doanh Thu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(results.totalRevenue)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown Card */}
          <Card>
            <CardHeader>
              <CardTitle>Chi Tiết Tính Toán</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Số lượng vàng:</span>
                  <span className="font-semibold">{goldAmount.toFixed(3)} chỉ</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Giá mua:</span>
                  <span className="font-semibold">
                    {formatCurrency(priceState.buyPrice!)} / chỉ
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Giá bán:</span>
                  <span className="font-semibold">
                    {formatCurrency(priceState.sellPrice!)} / chỉ
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Tổng vốn đầu tư:</span>
                  <span className="font-semibold">
                    {formatCurrency(results.totalInvestment)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Tổng doanh thu:</span>
                  <span className="font-semibold">
                    {formatCurrency(results.totalRevenue)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Thời gian nắm giữ:</span>
                  <span className="font-semibold">{results.holdingDays} ngày</span>
                </div>
                <div className="flex justify-between py-3 bg-muted/50 px-3 rounded-md mt-2">
                  <span className="font-semibold">Lãi/Lỗ:</span>
                  <span
                    className={cn(
                      'font-bold',
                      results.profitLoss > 0
                        ? 'text-green-600'
                        : results.profitLoss < 0
                        ? 'text-red-600'
                        : 'text-muted-foreground'
                    )}
                  >
                    {formatCurrency(results.profitLoss)} (
                    {results.profitLossPercent > 0 ? '+' : ''}
                    {results.profitLossPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart Card */}
          <Card>
            <CardHeader>
              <CardTitle>Biểu Đồ Giá Trị Đầu Tư</CardTitle>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : chartData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Không có dữ liệu biểu đồ cho khoảng thời gian này
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      className="text-xs"
                      stroke="currentColor"
                    />
                    <YAxis
                      tickFormatter={formatPrice}
                      className="text-xs"
                      stroke="currentColor"
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => {
                        try {
                          return format(new Date(label), 'PPP', { locale: vi })
                        } catch {
                          return label
                        }
                      }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Giá Trị"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Vốn Đầu Tư"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!showResults && (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Nhập thông tin và nhấn <strong>Tính Toán</strong> để xem kết quả
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
