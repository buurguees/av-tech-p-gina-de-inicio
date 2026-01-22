import { ReactNode } from "react";
import "../../styles/components/dashboard/detail-dashboard-products.css";

interface Product {
  id: string;
  name: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  [key: string]: any; // Para permitir campos adicionales
}

interface DetailDashboardProductsProps {
  title?: string;
  products: Product[];
  loading?: boolean;
  emptyMessage?: string;
  onProductClick?: (product: Product) => void;
  renderProduct?: (product: Product) => ReactNode;
  className?: string;
}

/**
 * Componente para mostrar productos/items en el Dashboard de detalle
 */
const DetailDashboardProducts = ({
  title = "Productos",
  products,
  loading = false,
  emptyMessage = "No hay productos",
  onProductClick,
  renderProduct,
  className,
}: DetailDashboardProductsProps) => {
  if (loading) {
    return (
      <div className={`detail-dashboard-products ${className || ""}`}>
        {title && <h2 className="detail-dashboard-products__title">{title}</h2>}
        <div className="detail-dashboard-products__loading">
          <p className="detail-dashboard-products__loading-text">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={`detail-dashboard-products ${className || ""}`}>
        {title && <h2 className="detail-dashboard-products__title">{title}</h2>}
        <div className="detail-dashboard-products__empty">
          <p className="detail-dashboard-products__empty-text">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`detail-dashboard-products ${className || ""}`}>
      {title && <h2 className="detail-dashboard-products__title">{title}</h2>}
      <div className="detail-dashboard-products__list">
        {products.map((product) => {
          if (renderProduct) {
            return (
              <div
                key={product.id}
                className={`detail-dashboard-products__item ${onProductClick ? 'detail-dashboard-products__item--clickable' : ''}`}
                onClick={() => onProductClick?.(product)}
              >
                {renderProduct(product)}
              </div>
            );
          }

          return (
            <div
              key={product.id}
              className={`detail-dashboard-products__item ${onProductClick ? 'detail-dashboard-products__item--clickable' : ''}`}
              onClick={() => onProductClick?.(product)}
            >
              <div className="detail-dashboard-products__item-content">
                <div className="detail-dashboard-products__item-main">
                  <span className="detail-dashboard-products__item-name">{product.name}</span>
                  {product.description && (
                    <span className="detail-dashboard-products__item-description">{product.description}</span>
                  )}
                </div>
                <div className="detail-dashboard-products__item-meta">
                  {product.quantity !== undefined && (
                    <span className="detail-dashboard-products__item-quantity">
                      Cant: {product.quantity}
                    </span>
                  )}
                  {product.total !== undefined && (
                    <span className="detail-dashboard-products__item-total">
                      {new Intl.NumberFormat("es-ES", {
                        style: "currency",
                        currency: "EUR",
                      }).format(product.total)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DetailDashboardProducts;
