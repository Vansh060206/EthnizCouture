import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('👑 Seeding EthnizCouture Database with Luxury Indian Ethnic Catalog...');

  // Clean existing data in reverse order of foreign keys
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123456', salt);
  const customerPasswordHash = await bcrypt.hash('Customer@123456', salt);

  const admin = await prisma.user.create({
    data: {
      name: 'Aditya Birla',
      email: 'admin@ethnizcouture.com',
      passwordHash: adminPasswordHash,
      phone: '+91 98200 12345',
      role: 'ADMIN'
    }
  });

  const customer = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya@example.com',
      passwordHash: customerPasswordHash,
      phone: '+91 98110 56789',
      role: 'CUSTOMER',
      addresses: {
        create: [
          {
            fullName: 'Priya Sharma',
            phone: '+91 98110 56789',
            street: '42, Altamount Road, Cumballa Hill',
            apartment: 'Flat 12B, Imperial Heights',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400026',
            country: 'India',
            isDefault: true
          },
          {
            fullName: 'Priya Sharma',
            phone: '+91 98110 56789',
            street: 'B-6/12 Safdarjung Enclave',
            apartment: 'Ground Floor',
            city: 'New Delhi',
            state: 'Delhi',
            pincode: '110029',
            country: 'India',
            isDefault: false
          }
        ]
      }
    }
  });

  console.log('✅ Admin and Customer created:');
  console.log('   Admin: admin@ethnizcouture.com / Admin@123456');
  console.log('   Customer: priya@example.com / Customer@123456');

  // 2. Create Categories
  const categoriesData = [
    {
      name: 'Sarees',
      slug: 'sarees',
      description: 'Heirloom six yards of grace woven by master artisans in Kanchipuram and Varanasi.',
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      featured: true
    },
    {
      name: 'Lehengas',
      slug: 'lehengas',
      description: 'Opulent bridal and festive lehengas intricately adorned with zardozi and gota patti.',
      image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
      featured: true
    },
    {
      name: 'Kurta Sets',
      slug: 'kurta-sets',
      description: 'Refined silhouette kurta sets paired with palazzos, churidars, and hand-embroidered dupattas.',
      image: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80',
      featured: true
    },
    {
      name: 'Anarkalis',
      slug: 'anarkalis',
      description: 'Regal floor-sweeping flares inspired by Mughal courtyards with shimmering kalis.',
      image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
      featured: true
    },
    {
      name: 'Sherwanis',
      slug: 'sherwanis',
      description: 'Bespoke royal menswear crafted in rich brocade, raw silk, and hand embroidery.',
      image: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=800&q=80',
      featured: true
    },
    {
      name: 'Kurtas',
      slug: 'kurtas',
      description: 'Everyday elegance and festive menswear tailored in pure linen, tussar, and chanderi.',
      image: 'https://images.unsplash.com/photo-1621609764095-b32bbe35cf3a?auto=format&fit=crop&w=800&q=80',
      featured: true
    },
    {
      name: 'Indo-Western',
      slug: 'indo-western',
      description: 'Contemporary draping meets timeless Indian couture for modern gala evenings.',
      image: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80',
      featured: true
    },
    {
      name: 'Accessories',
      slug: 'accessories',
      description: 'Handcrafted potlis, embroidered stoles, and ceremonial safas.',
      image: 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?auto=format&fit=crop&w=800&q=80',
      featured: false
    }
  ];

  const categories: Record<string, any> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.create({ data: cat });
    categories[cat.slug] = created;
  }
  console.log(`✅ Created ${categoriesData.length} Categories`);

  // 3. Create Collections
  const collectionsData = [
    {
      name: 'Royal Heritage Wedding',
      slug: 'royal-heritage-wedding',
      tagline: 'Centuries of regal craftsmanship reborn for the majestic Indian bride and groom.',
      bannerImage: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1600&q=85',
      featured: true
    },
    {
      name: 'Festive Zari Elegance',
      slug: 'festive-zari-elegance',
      tagline: 'Luminous antique gold threadwork woven on pure handloom silks for ceremonial radiance.',
      bannerImage: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85',
      featured: true
    },
    {
      name: 'Lucknowi Chikankari Atelier',
      slug: 'lucknowi-chikankari-atelier',
      tagline: 'Delicate floral shadow-work meticulously hand-stitched on gossamer mulmul and organza.',
      bannerImage: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1600&q=85',
      featured: true
    }
  ];

  const collections: Record<string, any> = {};
  for (const col of collectionsData) {
    const created = await prisma.collection.create({ data: col });
    collections[col.slug] = created;
  }
  console.log(`✅ Created ${collectionsData.length} Collections`);

  // 4. Create 26 Authentic Luxury Indian Products
  const products = [
    // SAREES
    {
      name: 'Varanasi Royal Crimson Katan Silk Saree',
      slug: 'varanasi-royal-crimson-katan-silk-saree',
      sku: 'EC-SAR-001',
      description: 'Handwoven in the ancient ghats of Varanasi, this crimson red Katan silk saree is embellished with antique gold zari shikargah motifs depicting floral vines and peacocks.',
      details: 'Woven with 100% pure Mulberry silk warp and weft. Features an ornate pallu with traditional meenakari detailing. Includes an unstitched matching blouse piece with zari border.',
      fabric: 'Pure Katan Silk',
      careInstructions: 'Dry clean only. Store wrapped in pure cotton or muslin fabric. Avoid perfume spray directly on zari.',
      gender: 'WOMEN',
      categoryId: categories['sarees'].id,
      collectionId: collections['royal-heritage-wedding'].id,
      price: 18999,
      comparePrice: 24500,
      discountPercent: 22,
      stock: 6,
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      availableSizes: 'Free Size',
      availableColors: 'Royal Crimson,Emerald Green',
      tags: 'Silk Saree,Banarasi,Bridal,Handwoven,Zari',
      images: [
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Kanchipuram Temple Border Gold Tissue Saree',
      slug: 'kanchipuram-temple-border-gold-tissue-saree',
      sku: 'EC-SAR-002',
      description: 'A masterpiece from Tamil Nadu weavers, woven in shimmering gold tissue with a contrasting ruby red Korvai temple border and intricate rudraksha motifs.',
      details: 'Pure gold zari thread woven into high-density silk warp. Heavy bridal pallu featuring Gajalakshmi motifs.',
      fabric: 'Kanjivaram Silk Tissue',
      careInstructions: 'Strictly dry clean. Periodic refolding along natural creases prevents zari breakage.',
      gender: 'WOMEN',
      categoryId: categories['sarees'].id,
      collectionId: collections['festive-zari-elegance'].id,
      price: 29500,
      comparePrice: 36000,
      discountPercent: 18,
      stock: 4,
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      availableSizes: 'Free Size',
      availableColors: 'Gold Tissue,Rose Gold',
      tags: 'Kanjivaram,South Indian Bridal,Gold Tissue,Korvai',
      images: [
        { url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Pastel Mint Organza Hand-Embroidered Saree',
      slug: 'pastel-mint-organza-hand-embroidered-saree',
      sku: 'EC-SAR-003',
      description: 'Ethereal sheer mint green organza saree adorned with delicate pearl cutwork, sequin embroidery, and scalloped borders.',
      details: 'Lightweight gossamer drape ideal for summer cocktail soirées and sangeet celebrations. Paired with an unstitched dupion silk blouse fabric.',
      fabric: 'Pure Silk Organza',
      careInstructions: 'Dry clean only. Steam iron on reverse at low heat.',
      gender: 'WOMEN',
      categoryId: categories['sarees'].id,
      price: 14500,
      comparePrice: 17999,
      discountPercent: 19,
      stock: 8,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: true,
      availableSizes: 'Free Size',
      availableColors: 'Mint Green,Powder Peach,Lavender Mist',
      tags: 'Organza Saree,Cutwork,Cocktail,Pastel,Handcrafted',
      images: [
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Chanderi Zari Buti Midnight Blue Saree',
      slug: 'chanderi-zari-buti-midnight-blue-saree',
      sku: 'EC-SAR-004',
      description: 'Heritage Chanderi silk cotton saree dipped in deep midnight indigo, highlighted with hand-punched gold and silver coin (ashrafi) butis.',
      details: 'Feather-light texture with subtle sheen. 6.5 meters including running blouse fabric.',
      fabric: 'Chanderi Silk Cotton',
      careInstructions: 'Dry clean recommended. Gentle hand wash in cold water with mild detergent.',
      gender: 'WOMEN',
      categoryId: categories['sarees'].id,
      price: 8999,
      comparePrice: 11500,
      discountPercent: 21,
      stock: 12,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      availableSizes: 'Free Size',
      availableColors: 'Midnight Blue,Rani Pink',
      tags: 'Chanderi,Handloom,Festive Wear,Silk Cotton',
      images: [
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },

    // LEHENGAS
    {
      name: 'Royal Maroon Velvet Heritage Bridal Lehenga',
      slug: 'royal-maroon-velvet-heritage-bridal-lehenga',
      sku: 'EC-LEH-001',
      description: 'Crafted for the quintessential royal bride, this bespoke maroon velvet lehenga features micro-zardozi handwork, dabka embroidery, and semi-precious bead detailing.',
      details: 'Includes a structured 16-kali velvet skirt with double can-can lining, sweetheart neckline blouse, and dual dupattas (one heavy velvet veil and one soft peach tulle dupatta).',
      fabric: 'Rich Micro Velvet & Organza Silk',
      careInstructions: 'Specialist dry clean only. Preserve in bridal trunk with cedarwood balls.',
      gender: 'WOMEN',
      categoryId: categories['lehengas'].id,
      collectionId: collections['royal-heritage-wedding'].id,
      price: 48999,
      comparePrice: 62000,
      discountPercent: 21,
      stock: 3, // Low stock test!
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      availableSizes: 'XS,S,M,L,XL',
      availableColors: 'Royal Maroon,Deep Burgundy',
      tags: 'Bridal Lehenga,Velvet,Zardozi,Double Dupatta,Wedding Couture',
      images: [
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Dusty Rose Mirror-Work Chikankari Lehenga',
      slug: 'dusty-rose-mirror-work-chikankari-lehenga',
      sku: 'EC-LEH-002',
      description: 'Meticulously embroidered by Lucknowi craftswomen with 32 distinct stitches of chikankari, accentuated with real foil mirror reflections and champagne sequins.',
      details: 'Lightweight silk georgette with voluminous flare. Paired with a contemporary halter-neck blouse and crushed organza dupatta.',
      fabric: 'Pure Silk Georgette & Lucknowi Mulmul',
      careInstructions: 'Dry clean only. Iron inside out.',
      gender: 'WOMEN',
      categoryId: categories['lehengas'].id,
      collectionId: collections['lucknowi-chikankari-atelier'].id,
      price: 34999,
      comparePrice: 42000,
      discountPercent: 16,
      stock: 5,
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: true,
      availableSizes: 'S,M,L,XL',
      availableColors: 'Dusty Rose,Ivory Champagne',
      tags: 'Chikankari,Mirror Work,Sangeet Lehenga,Pastel Bride',
      images: [
        { url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Emerald Green Brocade Banarasi Lehenga Set',
      slug: 'emerald-green-brocade-banarasi-lehenga-set',
      sku: 'EC-LEH-003',
      description: 'Lustrous emerald green Banarasi silk brocade skirt woven with royal jaal patterns in spun gold thread, complemented with an elbow-sleeve choli and tissue dupatta.',
      details: 'High-waisted silhouette with handcrafted latkan tassels. Built-in can-can layer for structural regal flare.',
      fabric: 'Banarasi Brocade Silk',
      careInstructions: 'Dry clean only.',
      gender: 'WOMEN',
      categoryId: categories['lehengas'].id,
      collectionId: collections['festive-zari-elegance'].id,
      price: 24999,
      comparePrice: 31000,
      discountPercent: 19,
      stock: 7,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      availableSizes: 'XS,S,M,L,XL,XXL',
      availableColors: 'Emerald Green,Royal Navy',
      tags: 'Banarasi Lehenga,Brocade,Mehendi,Reception',
      images: [
        { url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Sunflower Yellow Gota Patti Haldi Lehenga',
      slug: 'sunflower-yellow-gota-patti-haldi-lehenga',
      sku: 'EC-LEH-004',
      description: 'Vibrant celebratory yellow georgette lehenga tailored with traditional Rajasthani gota patti borders, mirror accents, and a flowing scalloped hemline.',
      details: 'Light and dance-friendly. Comes with sweetheart neck blouse and matching net dupatta.',
      fabric: 'Georgette & Net',
      careInstructions: 'Dry clean only.',
      gender: 'WOMEN',
      categoryId: categories['lehengas'].id,
      price: 19999,
      comparePrice: 25000,
      discountPercent: 20,
      stock: 9,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      availableSizes: 'S,M,L,XL',
      availableColors: 'Sunflower Yellow,Mustard Gold',
      tags: 'Haldi Lehenga,Gota Patti,Celebration,Bright',
      images: [
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },

    // KURTA SETS
    {
      name: 'Ivory Raw Silk Angrakha Kurta Set',
      slug: 'ivory-raw-silk-angrakha-kurta-set',
      sku: 'EC-KST-001',
      description: 'Graceful crossover Angrakha silhouette in ivory raw silk, accented with subtle zari stitching, handmade potli buttons, and paired with straight pants.',
      details: 'Features a sheer organza dupatta finished with pearl tassels. Pure cotton lining for absolute comfort.',
      fabric: 'Raw Silk & Pure Cotton Lining',
      careInstructions: 'Dry clean only.',
      gender: 'WOMEN',
      categoryId: categories['kurta-sets'].id,
      collectionId: collections['lucknowi-chikankari-atelier'].id,
      price: 12499,
      comparePrice: 15999,
      discountPercent: 21,
      stock: 11,
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: true,
      availableSizes: 'XS,S,M,L,XL,XXL',
      availableColors: 'Ivory White,Champagne Beige',
      tags: 'Kurta Set,Angrakha,Raw Silk,Festive,Minimal Luxury',
      images: [
        { url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Rani Pink Chanderi Kurta & Palazzo Suit',
      slug: 'rani-pink-chanderi-kurta-palazzo-suit',
      sku: 'EC-KST-002',
      description: 'Luminous deep pink handloom Chanderi kurta framed with intricate neckline tilla embroidery, paired with wide-legged palazzo trousers.',
      details: '3-piece ensemble: Kurta, Palazzo, and Printed Silk Dupatta. Concealed side zipper on trousers.',
      fabric: 'Chanderi Silk & Modal Cotton',
      careInstructions: 'Dry clean recommended.',
      gender: 'WOMEN',
      categoryId: categories['kurta-sets'].id,
      price: 9999,
      comparePrice: 12500,
      discountPercent: 20,
      stock: 8,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      availableSizes: 'S,M,L,XL',
      availableColors: 'Rani Pink,Marigold Orange',
      tags: 'Chanderi Kurta,Palazzo,Diwali Wear,Festive Pink',
      images: [
        { url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Teal Blue Velvet Embroidered Winter Suit',
      slug: 'teal-blue-velvet-embroidered-winter-suit',
      sku: 'EC-KST-003',
      description: 'Sumptuous jewel-toned teal velvet straight kurta with antique dabka and sequin borders, paired with cigarette pants and a banarasi zari shawl.',
      details: 'Fully lined with soft satin. Ideal for royal winter destination weddings.',
      fabric: 'Silk Velvet & Banarasi Silk',
      careInstructions: 'Dry clean only.',
      gender: 'WOMEN',
      categoryId: categories['kurta-sets'].id,
      price: 15999,
      comparePrice: 19500,
      discountPercent: 17,
      stock: 4,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      availableSizes: 'XS,S,M,L,XL',
      availableColors: 'Teal Blue,Midnight Plum',
      tags: 'Velvet Suit,Winter Wedding,Embroidered,Jewel Tone',
      images: [
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },

    // ANARKALIS
    {
      name: 'Imperial Wine Floor-Length Anarkali Gown',
      slug: 'imperial-wine-floor-length-anarkali-gown',
      sku: 'EC-ANA-001',
      description: 'An architectural silhouette with 24 flared kalis in deep wine georgette, embellished with hand-cut zardozi floral vines along the bodice and hemline.',
      details: 'Floor-sweeping 5-meter flare with lightweight structured petticoat. Accompanied by a matching churidar and embellished tulle veil.',
      fabric: 'Pure Silk Georgette',
      careInstructions: 'Dry clean only.',
      gender: 'WOMEN',
      categoryId: categories['anarkalis'].id,
      collectionId: collections['royal-heritage-wedding'].id,
      price: 26999,
      comparePrice: 34000,
      discountPercent: 20,
      stock: 5,
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      availableSizes: 'S,M,L,XL',
      availableColors: 'Imperial Wine,Midnight Emerald',
      tags: 'Anarkali,Gown,Floor Length,Zardozi,Reception Couture',
      images: [
        { url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Golden Sand Kalidar Chiffon Anarkali',
      slug: 'golden-sand-kalidar-chiffon-anarkali',
      sku: 'EC-ANA-002',
      description: 'Shimmering metallic gold chiffon flared anarkali layered with soft mulmul, highlighted with intricate threadwork and mukaish embellishments.',
      details: 'Lightweight movement with royal court drape. Paired with tonal churidar and badla dupatta.',
      fabric: 'Pure Chiffon & Silk Floss',
      careInstructions: 'Dry clean only.',
      gender: 'WOMEN',
      categoryId: categories['anarkalis'].id,
      price: 17999,
      comparePrice: 22000,
      discountPercent: 18,
      stock: 6,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      availableSizes: 'XS,S,M,L,XL,XXL',
      availableColors: 'Golden Sand,Rose Champagne',
      tags: 'Chiffon Anarkali,Kalidar,Mukaish,Celebration',
      images: [
        { url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },

    // SHERWANIS (MENSWEAR)
    {
      name: 'Royal Heritage Brocade Groom Sherwani',
      slug: 'royal-heritage-brocade-groom-sherwani',
      sku: 'EC-SHR-001',
      description: 'Regal ivory and antique gold Banarasi woven sherwani featuring bespoke crested metal buttons, mandarin collar, and discreet structured padding.',
      details: '4-piece groom couture set: Sherwani coat, inner raw silk kurta, matching churidar, and an embroidered silk stole with handcrafted fringe.',
      fabric: 'Pure Banarasi Brocade & Raw Silk',
      careInstructions: 'Specialist dry clean only. Store on wide wooden hanger inside garment bag.',
      gender: 'MEN',
      categoryId: categories['sherwanis'].id,
      collectionId: collections['royal-heritage-wedding'].id,
      price: 38999,
      comparePrice: 48000,
      discountPercent: 18,
      stock: 4,
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      availableSizes: '38,40,42,44,46',
      availableColors: 'Ivory Gold,Champagne Beige',
      tags: 'Groom Sherwani,Menswear,Brocade,Royal Wedding,Mandarin Collar',
      images: [
        { url: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1621609764095-b32bbe35cf3a?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Midnight Onyx Velvet Hand-Embroidered Sherwani',
      slug: 'midnight-onyx-velvet-hand-embroidered-sherwani',
      sku: 'EC-SHR-002',
      description: 'Sophisticated modern silhouette in jet-black micro-velvet, detailed with monochrome tone-on-tone thread embroidery and matte black metallic buttons.',
      details: 'Tailored for the groom or reception evening. Comes with tapered slim-fit trousers and pocket square.',
      fabric: 'Italian Micro Velvet & Silk Acetate Lining',
      careInstructions: 'Dry clean only.',
      gender: 'MEN',
      categoryId: categories['sherwanis'].id,
      price: 32500,
      comparePrice: 39999,
      discountPercent: 18,
      stock: 5,
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      availableSizes: '38,40,42,44',
      availableColors: 'Midnight Onyx,Deep Navy',
      tags: 'Black Sherwani,Velvet,Reception Wear,Modern Royal',
      images: [
        { url: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1621609764095-b32bbe35cf3a?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Blush Rose Jamawar Silk Sherwani',
      slug: 'blush-rose-jamawar-silk-sherwani',
      sku: 'EC-SHR-003',
      description: 'Refined pastel menswear in blush pink pure Jamawar silk weave, adorned with subtle Kashmiri paisley motifs and mother-of-pearl buttons.',
      details: 'Pairs harmoniously with pastel bridal ensembles. Complete with churidar and lightweight organza stole.',
      fabric: 'Pure Jamawar Silk',
      careInstructions: 'Dry clean only.',
      gender: 'MEN',
      categoryId: categories['sherwanis'].id,
      price: 28999,
      comparePrice: 35000,
      discountPercent: 17,
      stock: 6,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      availableSizes: '38,40,42,44',
      availableColors: 'Blush Rose,Mint Pistachio',
      tags: 'Pastel Groom,Jamawar,Kashmiri Weave,Day Wedding',
      images: [
        { url: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1621609764095-b32bbe35cf3a?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },

    // KURTAS (MENSWEAR)
    {
      name: 'Lucknowi Hand-Embroidered Chikan Silk Kurta',
      slug: 'lucknowi-hand-embroidered-chikan-silk-kurta',
      sku: 'EC-MKU-001',
      description: 'Pure chanderi silk men’s kurta featuring authentic Bakhiya and Phanda stitch chikankari on the chest and cuffs, matched with cotton-silk churidar.',
      details: 'Comfortable relaxed tailoring with side slits. High-grade mother-of-pearl button placket.',
      fabric: 'Chanderi Silk & Cotton Silk Blend',
      careInstructions: 'Dry clean or gentle hand wash.',
      gender: 'MEN',
      categoryId: categories['kurtas'].id,
      collectionId: collections['lucknowi-chikankari-atelier'].id,
      price: 7499,
      comparePrice: 9500,
      discountPercent: 21,
      stock: 15,
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: true,
      availableSizes: '38,40,42,44,46',
      availableColors: 'Ivory,Pale Sky Blue,Sage Green',
      tags: 'Men Kurta,Chikankari,Lucknowi,Festive,Pure Silk',
      images: [
        { url: 'https://images.unsplash.com/photo-1621609764095-b32bbe35cf3a?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Raw Silk Kurta with Embroidered Bundi Jacket',
      slug: 'raw-silk-kurta-with-embroidered-bundi-jacket',
      sku: 'EC-MKU-002',
      description: 'Earthy rust raw silk kurta paired with a structured Nehru waist-coat (Bundi) featuring woven floral vines and antique brass buttons.',
      details: 'Versatile 3-piece set (Kurta, Bundi Jacket, and Slim Trousers).',
      fabric: 'Raw Silk & Dupion Silk',
      careInstructions: 'Dry clean only.',
      gender: 'MEN',
      categoryId: categories['kurtas'].id,
      price: 14999,
      comparePrice: 18500,
      discountPercent: 18,
      stock: 7,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      availableSizes: '38,40,42,44',
      availableColors: 'Rust Ochre,Indigo Royal',
      tags: 'Nehru Jacket,Bundi,Raw Silk,Mehendi Outfit,Mens Festive',
      images: [
        { url: 'https://images.unsplash.com/photo-1621609764095-b32bbe35cf3a?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Olive Khadi Silk Asymmetric Festive Kurta',
      slug: 'olive-khadi-silk-asymmetric-festive-kurta',
      sku: 'EC-MKU-003',
      description: 'Modern asymmetric hemline kurta in olive green handloom khadi silk with side-button placket and tonal stitch lines.',
      details: 'Lightweight breathable texture with contemporary draped cut. Pairs well with dhotis or linen trousers.',
      fabric: 'Handloom Khadi Silk',
      careInstructions: 'Gentle hand wash in cold water.',
      gender: 'MEN',
      categoryId: categories['kurtas'].id,
      price: 5999,
      comparePrice: 7500,
      discountPercent: 20,
      stock: 14,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      availableSizes: '38,40,42,44,46',
      availableColors: 'Olive Green,Mustard Khadi',
      tags: 'Asymmetric Kurta,Khadi,Modern Menswear,Casual Festive',
      images: [
        { url: 'https://images.unsplash.com/photo-1621609764095-b32bbe35cf3a?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },

    // INDO-WESTERN
    {
      name: 'Draped Pre-Stitched Concept Saree with Embroidered Belt',
      slug: 'draped-pre-stitched-concept-saree-with-belt',
      sku: 'EC-INW-001',
      description: 'A revolutionary contemporary take on the timeless saree: pre-pleated satin georgette drape secured with an ornate pearl and zardozi embellished belt.',
      details: 'Includes structured bustier blouse with pearl drop tassels. Slips on effortlessly in 60 seconds.',
      fabric: 'Satin Georgette & Tulle',
      careInstructions: 'Dry clean only.',
      gender: 'WOMEN',
      categoryId: categories['indo-western'].id,
      price: 18499,
      comparePrice: 22999,
      discountPercent: 19,
      stock: 8,
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: true,
      availableSizes: 'XS,S,M,L,XL',
      availableColors: 'Champagne Gold,Wine Plum,Slate Silver',
      tags: 'Concept Saree,Ready to Wear,Indo Western,Cocktail Gala',
      images: [
        { url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Cape Lehenga Set with Sheer Embroidered Shrug',
      slug: 'cape-lehenga-set-with-sheer-embroidered-shrug',
      sku: 'EC-INW-002',
      description: 'Three-piece indo-western ensemble featuring a flared crepe skirt, bustier top, and a dramatically sweeping organza cape shrug adorned with gold fringes.',
      details: 'Duptta-free contemporary convenience for modern celebrations.',
      fabric: 'Crepe Silk & Sheer Organza',
      careInstructions: 'Dry clean only.',
      gender: 'WOMEN',
      categoryId: categories['indo-western'].id,
      price: 21999,
      comparePrice: 27500,
      discountPercent: 20,
      stock: 6,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      availableSizes: 'S,M,L,XL',
      availableColors: 'Lavender Lilac,Peach Bellini',
      tags: 'Cape Lehenga,Indo Western,Sangeet,Modern Silhouette',
      images: [
        { url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Men’s Asymmetric Indo-Western Jacket & Jodhpuris',
      slug: 'mens-asymmetric-indo-western-jacket-jodhpuris',
      sku: 'EC-INW-003',
      description: 'Charcoal grey structured Indo-Western coat with diagonal overlap front, metallic brooch fastening, and tailored equestrian Jodhpuri trousers.',
      details: 'Sharp Italian suiting fabric infused with Indian royal silhouette.',
      fabric: 'Wool Silk Blend & Satin Acetate',
      careInstructions: 'Dry clean only.',
      gender: 'MEN',
      categoryId: categories['indo-western'].id,
      price: 24500,
      comparePrice: 30000,
      discountPercent: 18,
      stock: 5,
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      availableSizes: '38,40,42,44',
      availableColors: 'Charcoal Grey,Midnight Blue',
      tags: 'Indo Western Men,Jodhpuri,Cocktail,Sharp Tailoring',
      images: [
        { url: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1621609764095-b32bbe35cf3a?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },

    // ACCESSORIES
    {
      name: 'Handcrafted Zardozi Bridal Potli Bag',
      slug: 'handcrafted-zardozi-bridal-potli-bag',
      sku: 'EC-ACC-001',
      description: 'Luxe velvet drawstring potli bag meticulously hand-embroidered with floral zardozi bullion wires and cascading pearl tassels.',
      details: 'Comfortably fits smartphones, makeup essentials, and keys. Braided gold chain wrist handle.',
      fabric: 'Silk Velvet & Faux Pearls',
      careInstructions: 'Spot clean only. Store in protective dust bag.',
      gender: 'WOMEN',
      categoryId: categories['accessories'].id,
      price: 3499,
      comparePrice: 4500,
      discountPercent: 22,
      stock: 20,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      availableSizes: 'One Size',
      availableColors: 'Royal Maroon,Emerald Green,Antique Gold',
      tags: 'Potli,Bridal Bag,Handmade,Zardozi,Accessories',
      images: [
        { url: 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    },
    {
      name: 'Royal Heritage Brocade Groom Safa Turban',
      slug: 'royal-heritage-brocade-groom-safa-turban',
      sku: 'EC-ACC-002',
      description: 'Pre-draped ready-to-wear wedding safa in shimmering gold brocade with ornate kalangi feather brooch mount.',
      details: 'Padded interior for all-day comfortable wear. Tailored in standard royal turban proportions.',
      fabric: 'Banarasi Brocade Silk',
      careInstructions: 'Dry clean only.',
      gender: 'MEN',
      categoryId: categories['accessories'].id,
      price: 4999,
      comparePrice: 6500,
      discountPercent: 23,
      stock: 12,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      availableSizes: 'Free Size',
      availableColors: 'Gold Zari,Rose Pink',
      tags: 'Safa,Turban,Groom Accessories,Royal Wedding',
      images: [
        { url: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=1000&q=85', isPrimary: true, order: 0 },
        { url: 'https://images.unsplash.com/photo-1621609764095-b32bbe35cf3a?auto=format&fit=crop&w=1000&q=85', isPrimary: false, order: 1 }
      ]
    }
  ];

  const createdProducts: any[] = [];
  for (const item of products) {
    const { images, ...productData } = item;
    const prod = await prisma.product.create({
      data: {
        ...productData,
        images: {
          create: images.map(img => ({
            url: img.url,
            altText: item.name,
            isPrimary: img.isPrimary,
            order: img.order
          }))
        }
      }
    });
    createdProducts.push(prod);
  }
  console.log(`✅ Created ${createdProducts.length} Luxury Products with Images`);

  // 5. Create Verified Customer Reviews
  const reviewsData = [
    {
      productIndex: 0, // Katan Silk Saree
      rating: 5,
      title: 'Heirloom quality! Truly royal experience.',
      comment: 'I ordered this saree for my sister’s wedding in Udaipur. The pure silk drape and the weight of the zari are breathtaking. Received compliments all evening. Packaging came in a beautiful ivory velvet box!',
      isVerifiedPurchase: true
    },
    {
      productIndex: 4, // Maroon Velvet Bridal Lehenga
      rating: 5,
      title: 'Made my wedding day magical.',
      comment: 'The zardozi embroidery is so fine and intricate. Even better in person than in the photos. The double dupatta draping gave me the exact royal maharani look I wanted. Thank you EthnizCouture!',
      isVerifiedPurchase: true
    },
    {
      productIndex: 8, // Angrakha Kurta Set
      rating: 5,
      title: 'Exquisite cut and silk texture.',
      comment: 'Fits true to size with subtle gold accents that feel understated yet undeniably luxurious. The organza dupatta is so soft and light.',
      isVerifiedPurchase: true
    },
    {
      productIndex: 13, // Brocade Sherwani
      rating: 5,
      title: 'Exceptional craftsmanship and fit.',
      comment: 'Ordered for our wedding pheras. The brocade is genuine Banarasi weave and the structured cut looks sharp and dignified. Highly recommended.',
      isVerifiedPurchase: true
    },
    {
      productIndex: 16, // Lucknowi Chikan Silk Kurta
      rating: 5,
      title: 'Pure comfort and artisanal elegance.',
      comment: 'The hand chikankari stitches are flawless. You can feel the hours of human craft in every centimeter. Perfect for festive dinners.',
      isVerifiedPurchase: true
    }
  ];

  for (const rev of reviewsData) {
    if (createdProducts[rev.productIndex]) {
      await prisma.review.create({
        data: {
          productId: createdProducts[rev.productIndex].id,
          userId: customer.id,
          rating: rev.rating,
          title: rev.title,
          comment: rev.comment,
          isVerifiedPurchase: rev.isVerifiedPurchase,
          status: 'APPROVED'
        }
      });
    }
  }
  console.log(`✅ Created initial customer reviews`);

  // 6. Create Coupons
  const couponsData = [
    {
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderValue: 1999,
      maxDiscount: 2000,
      usageLimit: 500,
      isActive: true
    },
    {
      code: 'FESTIVE20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minOrderValue: 4999,
      maxDiscount: 3500,
      usageLimit: 200,
      isActive: true
    },
    {
      code: 'ROYAL500',
      discountType: 'FIXED',
      discountValue: 500,
      minOrderValue: 3500,
      maxDiscount: 500,
      usageLimit: 1000,
      isActive: true
    }
  ];

  for (const c of couponsData) {
    await prisma.coupon.create({ data: c });
  }
  console.log(`✅ Created ${couponsData.length} promotional coupons`);

  // 7. Create Homepage & Content Banners
  const bannersData = [
    {
      key: 'announcement',
      title: 'Complimentary Pan-India Shipping on Orders Above ₹2,999 | Private Bridal Atelier Appointments Available',
      order: 1,
      isActive: true
    },
    {
      key: 'hero',
      title: 'Where Tradition Meets Timeless Elegance',
      subtitle: 'Curated Indian ethnic wear crafted for celebrations, traditions and unforgettable moments.',
      buttonText: 'EXPLORE COUTURE',
      buttonLink: '/shop',
      imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1920&q=90',
      tag: 'New Festive 2026 Collection',
      order: 1,
      isActive: true
    },
    {
      key: 'festive_spotlight',
      title: 'The Royal Wedding & Festive Pavilion',
      subtitle: 'Immerse yourself in handloom Banarasi brocades, antique zardozi lehengas, and regal bespoke sherwanis.',
      buttonText: 'SHOP FESTIVE EDIT',
      buttonLink: '/shop?collection=royal-heritage-wedding',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=90',
      tag: 'Editorial Showcase',
      order: 2,
      isActive: true
    }
  ];

  for (const b of bannersData) {
    await prisma.banner.create({ data: b });
  }
  console.log(`✅ Created dynamic store banners`);

  // 8. Create a Sample Completed Order with Order Tracking History
  const sampleProduct1 = createdProducts[0];
  const sampleProduct2 = createdProducts[4];

  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber: 'EC-2026-10824',
      userId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone || '+91 98110 56789',
      shippingStreet: '42, Altamount Road, Cumballa Hill',
      shippingApartment: 'Flat 12B, Imperial Heights',
      shippingCity: 'Mumbai',
      shippingState: 'Maharashtra',
      shippingPincode: '400026',
      subtotal: sampleProduct1.price + sampleProduct2.price,
      discountAmount: 2000,
      shippingFee: 0,
      taxAmount: 0,
      totalAmount: sampleProduct1.price + sampleProduct2.price - 2000,
      couponCode: 'WELCOME10',
      paymentStatus: 'PAID',
      orderStatus: 'SHIPPED',
      paymentMethod: 'STRIPE',
      paymentIntentId: 'pi_demo_order_10824',
      trackingNumber: 'BLUEDART-8821934',
      items: {
        create: [
          {
            productId: sampleProduct1.id,
            productName: sampleProduct1.name,
            productImage: sampleProduct1.slug ? 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80' : null,
            size: 'Free Size',
            color: 'Royal Crimson',
            price: sampleProduct1.price,
            quantity: 1,
            total: sampleProduct1.price
          },
          {
            productId: sampleProduct2.id,
            productName: sampleProduct2.name,
            productImage: sampleProduct2.slug ? 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80' : null,
            size: 'M',
            color: 'Royal Maroon',
            price: sampleProduct2.price,
            quantity: 1,
            total: sampleProduct2.price
          }
        ]
      },
      statusHistory: {
        create: [
          { status: 'PENDING', notes: 'Order placed by customer.', createdAt: new Date(Date.now() - 86400000 * 3) },
          { status: 'CONFIRMED', notes: 'Payment verified via Stripe.', createdAt: new Date(Date.now() - 86400000 * 3 + 3600000) },
          { status: 'PROCESSING', notes: 'Artisanal packaging and quality audit initiated.', createdAt: new Date(Date.now() - 86400000 * 2) },
          { status: 'PACKED', notes: 'Secured in luxury velvet box with heritage seals.', createdAt: new Date(Date.now() - 86400000 * 1) },
          { status: 'SHIPPED', notes: 'Dispatched via Blue Dart Air Express. AWB: BLUEDART-8821934.', createdAt: new Date() }
        ]
      }
    }
  });

  console.log(`✅ Sample Order created: ${sampleOrder.orderNumber}`);
  console.log('🎉 EthnizCouture Database successfully seeded with luxury assets!');
}

main()
  .catch(e => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
