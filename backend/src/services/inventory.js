import Product from '../models/Product.js';

export async function decreaseStock(items) {
  for (const it of items) {
    const ok = await Product.updateOne(
      { _id: it.productId, stock: { $gte: it.quantity } },
      { $inc: { stock: -it.quantity } }
    );
    if (ok.modifiedCount === 0) throw new Error(`Stock insuficiente para producto ${it.productId}`);
  }
}

export async function increaseStock(items) {
  for (const it of items) {
    await Product.updateOne({ _id: it.productId }, { $inc: { stock: it.quantity } });
  }
}