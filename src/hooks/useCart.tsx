import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productInCartFound = updatedCart.find(productInCart => productInCart.id === productId);
      const response = await api.get(`/stock/${productId}`);
      const stockAmount = response.data.amount;
      const currentAmount = productInCartFound?.amount || 0;
      const amount = currentAmount + 1;
      
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (!productInCartFound) {
        const response = await api.get(`/products/${productId}`);
        const product = response.data;

        const newProductToCart = {
          ...product,
          amount: 1
        }
        updatedCart.push(newProductToCart);

      } else {
        productInCartFound.amount = amount
      }

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.find(product => product.id === productId)) throw new Error();

      const cartWithoutProduct = cart.filter(product => product.id !== productId);

      setCart(cartWithoutProduct);

      if (!Object.keys(cartWithoutProduct).length) {
        localStorage.removeItem("@RocketShoes:cart");
        return;
      }

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartWithoutProduct));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const response = await api.get(`/stock/${productId}`);
      const productStock = response.data.amount;
     
      if (amount < 1) return;

      if (amount > productStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(product => {
        if (product.id === productId){
          return {
            ...product,
            amount: amount
          }
        }
        return product;
      });


      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
