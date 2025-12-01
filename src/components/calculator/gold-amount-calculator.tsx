'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { formatCurrency, cn } from '@/lib/utils'
import { RETAILERS, PRODUCT_TYPES, PROVINCES, type Retailer, type ProductType, type Province } from '@/lib/constants'
import { useCurrentPrices } from '@/lib/queries/use-current-prices'

export function GoldAmountCalculator() {
  const [vndAmount, setVndAmount] = useState<number>(0)
  const [retailer, setRetailer] = useState<Retailer | ''>('')
  const [productType, setProductType] = useState<ProductType | ''>('')
  const [province, setProvince] = useState<Province | ''>('')

  const { data: currentPrices, isLoading: pricesLoading } = useCurrentPrices()

  // Create a map of current prices for quick lookup
  // Use sell_price (retailer's sell price) - this is what user pays when buying
  const currentPriceMap = useMemo(() => {
    const map = new Map<string, { sellPrice: number; buyPrice: number }>()
    if (currentPrices?.data) {
      currentPrices.data.forEach((price) => {
        const key = `${price.retailer}-${price.province || ''}-${price.product_type}`
        map.set(key, {
          sellPrice: Number(price.sell_price),
          buyPrice: Number(price.buy_price),
        })
      })
    }
    return map
  }, [currentPrices])

  /**
   * Get current sell price for selected options
   */
  const getCurrentPrice = (r: Retailer | '', prov: Province | '', pt: ProductType | '') => {
    if (!r || !pt) return null
    const key = `${r}-${prov || ''}-${pt}`
    return currentPriceMap.get(key) || null
  }

  /**
   * Calculate gold amount and change
   */
  const calculation = useMemo(() => {
    if (!retailer || !productType || vndAmount <= 0) {
      return null
    }

    const priceData = getCurrentPrice(retailer, province, productType)
    if (!priceData) return null

    const sellPrice = priceData.sellPrice
    const exactGoldAmount = vndAmount / sellPrice // Exact amount in chỉ
    const goldAmount = Math.floor(exactGoldAmount * 2) / 2 // Round down to nearest 0.5
    const totalCost = goldAmount * sellPrice
    const changeAmount = vndAmount - totalCost // Leftover VND

    return {
      exactGoldAmount,
      goldAmount,
      changeAmount,
      sellPrice,
      buyPrice: priceData.buyPrice,
      totalCost,
    }
  }, [vndAmount, retailer, province, productType, currentPriceMap])

  /**
   * Get comparison with other gold types in same province
   */
  const comparisons = useMemo(() => {
    if (!retailer || !province || !productType || vndAmount <= 0) {
      return []
    }

    return PRODUCT_TYPES.filter((pt) => pt.value !== productType)
      .map((pt) => {
        const priceData = getCurrentPrice(retailer, province, pt.value)
        if (!priceData) return null

        const exactGoldAmount = vndAmount / priceData.sellPrice
        const goldAmount = Math.floor(exactGoldAmount * 2) / 2 // Round down to nearest 0.5
        const totalCost = goldAmount * priceData.sellPrice
        const changeAmount = vndAmount - totalCost
        const difference = goldAmount - (calculation?.goldAmount || 0)
        const percentDiff = calculation?.goldAmount
          ? ((goldAmount - calculation.goldAmount) / calculation.goldAmount) * 100
          : 0

        return {
          productType: pt,
          goldAmount,
          changeAmount,
          sellPrice: priceData.sellPrice,
          difference,
          percentDiff,
        }
      })
      .filter((c) => c !== null)
  }, [retailer, province, productType, vndAmount, calculation, currentPriceMap])

  /**
   * Get product type label
   */
  function getProductTypeLabel(pt: string): string {
    const product = PRODUCT_TYPES.find((p) => p.value === pt)
    return product?.label || pt
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Thông Tin Tính Toán</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* VND Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="vnd-amount">Số Tiền (VND)</Label>
            <Input
              id="vnd-amount"
              type="number"
              step="1000"
              min="0"
              value={vndAmount || ''}
              onChange={(e) => setVndAmount(parseInt(e.target.value) || 0)}
              placeholder="Nhập số tiền VND"
              className="text-lg"
            />
            {vndAmount > 0 && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(vndAmount)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Retailer Select */}
            <div className="space-y-2">
              <Label htmlFor="retailer">Nhà Bán</Label>
              <Select value={retailer} onValueChange={(value) => setRetailer(value as Retailer)}>
                <SelectTrigger id="retailer">
                  <SelectValue placeholder="Chọn nhà bán" />
                </SelectTrigger>
                <SelectContent>
                  {RETAILERS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Province Select */}
            <div className="space-y-2">
              <Label htmlFor="province">Tỉnh/Thành Phố</Label>
              <Select value={province} onValueChange={(value) => setProvince(value as Province)}>
                <SelectTrigger id="province">
                  <SelectValue placeholder="Chọn tỉnh/TP" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Type Select */}
            <div className="space-y-2">
              <Label htmlFor="product-type">Loại Vàng</Label>
              <Select value={productType} onValueChange={(value) => setProductType(value as ProductType)}>
                <SelectTrigger id="product-type">
                  <SelectValue placeholder="Chọn loại vàng" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {calculation && (
        <>
          {/* Main Calculation Result */}
          <Card>
            <CardHeader>
              <CardTitle>Kết Quả Tính Toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pricesLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gold Amount */}
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Số Lượng Vàng</p>
                      <p className="text-3xl font-bold text-primary">
                        {calculation.goldAmount.toFixed(1)} chỉ
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Làm tròn xuống bội số 0.5 chỉ
                      </p>
                    </div>

                    {/* Change Amount */}
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Tiền Thừa</p>
                      <p className="text-3xl font-bold">
                        {formatCurrency(calculation.changeAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Số tiền lẻ sau khi mua
                      </p>
                    </div>
                  </div>

                  {/* Price Details */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Giá bán (mua vào):</span>
                      <span className="font-semibold">{formatCurrency(calculation.sellPrice)}/chỉ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Giá mua (bán ra):</span>
                      <span className="font-semibold">{formatCurrency(calculation.buyPrice)}/chỉ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Chênh lệch mua/bán:</span>
                      <Badge variant="outline">
                        {formatCurrency(calculation.sellPrice - calculation.buyPrice)}
                      </Badge>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold">Tóm Tắt</p>
                    <p className="text-sm text-muted-foreground">
                      Với <span className="font-semibold text-foreground">{formatCurrency(vndAmount)}</span>,
                      bạn có thể mua được{' '}
                      <span className="font-semibold text-foreground">
                        {calculation.goldAmount.toFixed(1)} chỉ
                      </span>{' '}
                      {getProductTypeLabel(productType)} tại <span className="font-semibold text-foreground">{retailer}</span>{' '}
                      {province && `ở ${province}`}.
                      {calculation.changeAmount > 0 && (
                        <>
                          {' '}Bạn sẽ nhận lại{' '}
                          <span className="font-semibold text-foreground">
                            {formatCurrency(calculation.changeAmount)}
                          </span>{' '}
                          tiền thừa.
                        </>
                      )}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Comparison with Other Gold Types */}
          {comparisons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>So Sánh Với Loại Vàng Khác</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Cùng nhà bán {retailer} {province && `tại ${province}`}
                </p>
              </CardHeader>
              <CardContent>
                {pricesLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="space-y-3">
                    {comparisons.map((comp) => (
                      <div
                        key={comp.productType.value}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{comp.productType.label}</h4>
                            <p className="text-sm text-muted-foreground">
                              Giá: {formatCurrency(comp.sellPrice)}/chỉ
                            </p>
                          </div>
                          <Badge
                            variant={comp.difference > 0 ? 'success' : comp.difference < 0 ? 'destructive' : 'secondary'}
                            className="ml-2"
                          >
                            {comp.difference > 0 ? '+' : ''}
                            {comp.difference.toFixed(1)} chỉ
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Số lượng mua được:</p>
                            <p className="font-semibold">{comp.goldAmount.toFixed(1)} chỉ</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Tiền thừa:</p>
                            <p className="font-semibold">{formatCurrency(comp.changeAmount)}</p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            {comp.difference > 0 ? (
                              <span className="text-green-600">
                                Mua được nhiều hơn {comp.difference.toFixed(1)} chỉ ({Math.abs(comp.percentDiff).toFixed(1)}%) so với{' '}
                                {getProductTypeLabel(productType)}
                              </span>
                            ) : comp.difference < 0 ? (
                              <span className="text-red-600">
                                Mua được ít hơn {Math.abs(comp.difference).toFixed(1)} chỉ ({Math.abs(comp.percentDiff).toFixed(1)}%) so với{' '}
                                {getProductTypeLabel(productType)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                Mua được số lượng bằng nhau
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!calculation && vndAmount > 0 && retailer && productType && (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Không tìm thấy giá cho lựa chọn hiện tại. Vui lòng thử lại với các tùy chọn khác.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Initial State */}
      {vndAmount === 0 && (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Nhập số tiền và chọn các thông tin để bắt đầu tính toán
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
