import "dotenv/config";
import { db } from "./index";
import {
  agencySettings,
  agents,
  listingImages,
  listings,
  users,
} from "./schema";
import { hashPassword } from "@/lib/auth/password";
import { uniqueSlug } from "@/lib/utils";

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=80`;

async function seed() {
  console.log("⏳ Seeding database…");

  // --- Admin user (idempotent) --------------------------------------------
  const email = process.env.ADMIN_EMAIL || "admin@virginestateagents.co.zw";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  await db
    .insert(users)
    .values({ email, name: "Site Administrator", passwordHash: hashPassword(password) })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash: hashPassword(password) },
    });
  console.log(`  ✓ admin user: ${email}`);

  // --- Agency settings -----------------------------------------------------
  await db
    .insert(agencySettings)
    .values({
      id: 1,
      name: "Virgin Estate Agents",
      tagline: "Property, considered.",
      phone: "+263 24 2000 000",
      whatsapp: "+263 77 000 0000",
      email: "info@virginestateagents.co.zw",
      officeAddress: "Borrowdale, Harare, Zimbabwe",
      heroHeadline: "Find a home worth coming back to.",
      heroSubheadline:
        "A considered selection of houses, apartments, stands and commercial property across Harare's most sought-after suburbs.",
    })
    .onConflictDoUpdate({ target: agencySettings.id, set: { name: "Virgin Estate Agents" } });
  console.log("  ✓ agency settings");

  // --- Reset demo content --------------------------------------------------
  await db.delete(listingImages);
  await db.delete(listings);
  await db.delete(agents);

  // --- Agents --------------------------------------------------------------
  const [tendai, rumbi, farai] = await db
    .insert(agents)
    .values([
      {
        name: "Tendai Moyo",
        title: "Senior Sales Agent",
        email: "tendai@virginestateagents.co.zw",
        phone: "+263 77 123 4567",
        whatsapp: "+263 77 123 4567",
        photoUrl: img("1507003211169-0a1dd7228f2d"),
        bio: "Fifteen years matching families with homes across Harare's northern suburbs.",
        sortOrder: 0,
      },
      {
        name: "Rumbidzai Chikanya",
        title: "Rentals Specialist",
        email: "rumbi@virginestateagents.co.zw",
        phone: "+263 71 987 6543",
        whatsapp: "+263 71 987 6543",
        photoUrl: img("1573496359142-b8d87734a5a2"),
        bio: "Helping tenants and landlords find the right fit, the first time.",
        sortOrder: 1,
      },
      {
        name: "Farai Ncube",
        title: "Commercial & Land",
        email: "farai@virginestateagents.co.zw",
        phone: "+263 78 222 3344",
        whatsapp: "+263 78 222 3344",
        photoUrl: img("1500648767791-00dcc994a43e"),
        bio: "Stands, smallholdings and commercial space — from search to transfer.",
        sortOrder: 2,
      },
    ])
    .returning();

  // --- Listings ------------------------------------------------------------
  const now = new Date();
  const seedListings = [
    {
      title: "Elegant 4-Bedroom Family Home in Borrowdale",
      description:
        "A beautifully presented family home set on a manicured half-acre stand in the heart of Borrowdale. Light-filled open-plan living spaces flow onto a covered patio overlooking the pool and garden. Fully fitted kitchen, generous bedrooms, and a self-contained cottage.",
      status: "for_sale" as const,
      kind: "sale" as const,
      propertyType: "house" as const,
      price: 485000,
      bedrooms: 4,
      bathrooms: 3,
      garages: 2,
      landSizeSqm: 2000,
      floorSizeSqm: 380,
      suburb: "Borrowdale",
      features: ["Swimming pool", "Borehole", "Solar / inverter system", "Staff quarters", "Walled & electric fence"],
      agentId: tendai.id,
      isFeatured: true,
      images: ["1600585154340-be6161a56a0c", "1600607687939-ce8a6c25118c", "1600566753086-00f18fb6b3ea"],
      lat: -17.751, lng: 31.107,
    },
    {
      title: "Modern Cluster Home in Mount Pleasant",
      description:
        "Low-maintenance contemporary living in a secure, leafy cluster development. Three en-suite bedrooms, double-volume lounge, and a private courtyard garden. Ideal lock-up-and-go for professionals.",
      status: "for_sale" as const,
      kind: "sale" as const,
      propertyType: "cluster" as const,
      price: 265000,
      bedrooms: 3,
      bathrooms: 3,
      garages: 2,
      landSizeSqm: 600,
      floorSizeSqm: 240,
      suburb: "Mount Pleasant",
      features: ["Borehole", "Automated gate", "Fitted kitchen", "Fibre internet"],
      agentId: tendai.id,
      isFeatured: true,
      images: ["1568605114967-8130f3a36994", "1600210492486-724fe5c67fb0", "1605276374104-dee2a0ed3cd6"],
      lat: -17.762, lng: 31.041,
    },
    {
      title: "Sunlit 2-Bedroom Apartment in Avondale",
      description:
        "A bright, well-finished apartment within walking distance of Avondale's shops and cafés. Open-plan kitchen and living area, secure parking, and 24-hour security. Perfect first home or investment.",
      status: "for_sale" as const,
      kind: "sale" as const,
      propertyType: "apartment" as const,
      price: 119000,
      bedrooms: 2,
      bathrooms: 2,
      garages: 1,
      floorSizeSqm: 95,
      suburb: "Avondale",
      features: ["Backup water tank", "Automated gate", "Fibre internet", "Open-plan living"],
      agentId: rumbi.id,
      isFeatured: true,
      images: ["1600121848594-d8644e57abab", "1600047509807-ba8f99d2cdde", "1600573472550-8090b5e0745e"],
      lat: -17.799, lng: 31.034,
    },
    {
      title: "Spacious Home to Let in Highlands",
      description:
        "Available immediately — a charming four-bedroom home on a large, established stand. Wooden floors, a country kitchen, and a wraparound veranda. Pet friendly, with a borehole and staff accommodation.",
      status: "for_sale" as const,
      kind: "rent" as const,
      propertyType: "house" as const,
      price: 1800,
      rentPeriod: "month",
      bedrooms: 4,
      bathrooms: 2,
      garages: 2,
      landSizeSqm: 4000,
      suburb: "Highlands",
      features: ["Borehole", "Staff quarters", "Established garden", "Pet friendly"],
      agentId: rumbi.id,
      isFeatured: false,
      images: ["1564013799919-ab600027ffc6", "1600585152220-90363fe7e115"],
      lat: -17.793, lng: 31.090,
    },
    {
      title: "Prime Residential Stand in Glen Lorne",
      description:
        "A rare, gently sloping 4,000 m² stand in a tranquil, upmarket pocket of Glen Lorne. Serviced and ready to build your dream home, with sweeping views of the surrounding hills.",
      status: "under_offer" as const,
      kind: "sale" as const,
      propertyType: "stand" as const,
      price: 95000,
      bedrooms: 0,
      bathrooms: 0,
      garages: 0,
      landSizeSqm: 4000,
      suburb: "Glen Lorne",
      features: ["Walled & electric fence"],
      agentId: farai.id,
      isFeatured: false,
      images: ["1500382017468-9049fed747ef", "1416879595882-3373a0480b5b"],
      lat: -17.741, lng: 31.150,
    },
    {
      title: "Town Centre Commercial Building",
      description:
        "Well-located commercial premises offering flexible office and retail space over two floors, with secure parking and backup power. A solid income-producing opportunity in a high-footfall area.",
      status: "sold" as const,
      kind: "sale" as const,
      propertyType: "commercial" as const,
      price: 720000,
      bedrooms: 0,
      bathrooms: 4,
      garages: 8,
      floorSizeSqm: 900,
      suburb: "Belgravia",
      features: ["Solar / inverter system", "Automated gate", "Fibre internet"],
      agentId: farai.id,
      isFeatured: false,
      images: ["1486406146926-c627a92ad1ab", "1497366754035-f200968a6e72"],
      lat: -17.812, lng: 31.045,
    },
  ];

  for (const l of seedListings) {
    const { images, lat, lng, ...rest } = l;
    const [created] = await db
      .insert(listings)
      .values({
        ...rest,
        slug: uniqueSlug(l.title),
        city: "Harare",
        latitude: lat,
        longitude: lng,
        publishedAt: now,
      })
      .returning();

    await db.insert(listingImages).values(
      images.map((id, i) => ({
        listingId: created.id,
        key: `seed/${id}`,
        url: img(id),
        alt: l.title,
        sortOrder: i,
        isCover: i === 0,
      })),
    );
  }
  console.log(`  ✓ ${seedListings.length} listings with images`);

  console.log("✅ Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
