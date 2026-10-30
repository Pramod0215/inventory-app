import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from '../src/models/Product.js';

dotenv.config();

const products = [
  {
    sku: 'STEEL-TMT-12',
    name: 'TMT Steel Rod 12mm',
    brand: 'SteelMax',
    category: 'construction',
    quantity: 48,
    price: 190,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a4f1?auto=format&fit=crop&w=900&q=80',
  },
  {
    sku: 'STEEL-TMT-16',
    name: 'TMT Bar 16mm',
    brand: 'BuildStrong',
    category: 'construction',
    quantity: 32,
    price: 260,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80',
  },
  {
    sku: 'CON-BEAM-SET',
    name: 'Construction Beam Set',
    brand: 'IronCore',
    category: 'construction',
    quantity: 18,
    price: 440,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80',
  },
  {
    sku: 'PVC-PIPE-2',
    name: 'PVC Pipe 2 inch',
    brand: 'FlowPro',
    category: 'hardware',
    quantity: 60,
    price: 120,
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1581092335399-7f0dfb056f9c?auto=format&fit=crop&w=900&q=80',
  },
  {
    sku: 'GI-PIPE-1',
    name: 'GI Pipe 1 inch',
    brand: 'PipeElite',
    category: 'hardware',
    quantity: 22,
    price: 210,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
  },
  {
    sku: 'PIPE-FITTING-KIT',
    name: 'Pipe Fittings Kit',
    brand: 'ReadyFlow',
    category: 'hardware',
    quantity: 14,
    price: 320,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=900&q=80',
  },
];

try {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_app';
  await mongoose.connect(uri);
  await Promise.all(
    products.map(({ sku, ...product }) =>
      Product.updateOne({ sku }, { $setOnInsert: { sku, ...product } }, { upsert: true })
    )
  );
  console.info(`Seeded ${products.length} commerce products`);
} catch (error) {
  console.error('Unable to seed commerce products:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
