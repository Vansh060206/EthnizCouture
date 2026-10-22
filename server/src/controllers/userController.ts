import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import {
  validateFullName,
  validatePhone,
  validateStreet,
  validateCity,
  validateState,
  validatePincode
} from '../utils/validation';

export const getAddresses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    let addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
    });

    // If customer has no saved address in address book, auto-recover from their most recent order
    if (addresses.length === 0) {
      const pastOrder = await prisma.order.findFirst({
        where: {
          OR: [
            { userId: req.user.id },
            { customerEmail: req.user.email.toLowerCase().trim() },
            { customerEmail: req.user.email }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      if (pastOrder && pastOrder.shippingStreet && pastOrder.shippingCity && pastOrder.shippingPincode) {
        try {
          const autoSavedAddress = await prisma.address.create({
            data: {
              userId: req.user.id,
              fullName: pastOrder.customerName || req.user.name,
              phone: pastOrder.customerPhone || req.user.phone || '',
              street: pastOrder.shippingStreet,
              apartment: pastOrder.shippingApartment || null,
              city: pastOrder.shippingCity,
              state: pastOrder.shippingState,
              pincode: pastOrder.shippingPincode,
              country: pastOrder.shippingCountry || 'India',
              isDefault: true
            }
          });
          addresses = [autoSavedAddress];

          // Ensure user.phone is up-to-date
          if (!req.user.phone && pastOrder.customerPhone) {
            await prisma.user.update({
              where: { id: req.user.id },
              data: { phone: pastOrder.customerPhone }
            });
          }
        } catch (recoverErr) {
          console.warn('Could not auto-recover address from past order:', recoverErr);
        }
      }
    }

    res.json({ addresses });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch addresses' });
  }
};

export const addAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { fullName, phone, street, apartment, city, state, pincode, country = 'India', isDefault = false } = req.body;

    const nameVal = validateFullName(fullName, 'Recipient Name');
    if (!nameVal.isValid) {
      res.status(400).json({ message: nameVal.message, field: 'fullName' });
      return;
    }

    const phoneVal = validatePhone(phone, true);
    if (!phoneVal.isValid) {
      res.status(400).json({ message: phoneVal.message, field: 'phone' });
      return;
    }

    const streetVal = validateStreet(street);
    if (!streetVal.isValid) {
      res.status(400).json({ message: streetVal.message, field: 'street' });
      return;
    }

    const cityVal = validateCity(city);
    if (!cityVal.isValid) {
      res.status(400).json({ message: cityVal.message, field: 'city' });
      return;
    }

    const stateVal = validateState(state);
    if (!stateVal.isValid) {
      res.status(400).json({ message: stateVal.message, field: 'state' });
      return;
    }

    const pincodeVal = validatePincode(pincode);
    if (!pincodeVal.isValid) {
      res.status(400).json({ message: pincodeVal.message, field: 'pincode' });
      return;
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: req.user.id,
        fullName: fullName.trim(),
        phone: phone.trim(),
        street: street.trim(),
        apartment: apartment?.trim() || null,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        country,
        isDefault
      }
    });

    // Sync phone with user profile
    if (phone && (!req.user.phone || req.user.phone.trim().length === 0)) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { phone: phone.trim() }
      }).catch(() => {});
    }

    res.status(201).json({ message: 'Address saved successfully', address });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to save address' });
  }
};

export const updateAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const id = String(req.params.id);
    const { fullName, phone, street, apartment, city, state, pincode, country, isDefault } = req.body;

    const existing = await prisma.address.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existing) {
      res.status(404).json({ message: 'Address not found' });
      return;
    }

    if (fullName !== undefined) {
      const nameVal = validateFullName(fullName, 'Recipient Name');
      if (!nameVal.isValid) {
        res.status(400).json({ message: nameVal.message, field: 'fullName' });
        return;
      }
    }

    if (phone !== undefined) {
      const phoneVal = validatePhone(phone, true);
      if (!phoneVal.isValid) {
        res.status(400).json({ message: phoneVal.message, field: 'phone' });
        return;
      }
    }

    if (street !== undefined) {
      const streetVal = validateStreet(street);
      if (!streetVal.isValid) {
        res.status(400).json({ message: streetVal.message, field: 'street' });
        return;
      }
    }

    if (city !== undefined) {
      const cityVal = validateCity(city);
      if (!cityVal.isValid) {
        res.status(400).json({ message: cityVal.message, field: 'city' });
        return;
      }
    }

    if (state !== undefined) {
      const stateVal = validateState(state);
      if (!stateVal.isValid) {
        res.status(400).json({ message: stateVal.message, field: 'state' });
        return;
      }
    }

    if (pincode !== undefined) {
      const pincodeVal = validatePincode(pincode);
      if (!pincodeVal.isValid) {
        res.status(400).json({ message: pincodeVal.message, field: 'pincode' });
        return;
      }
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false }
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        fullName: fullName?.trim(),
        phone: phone?.trim(),
        street: street?.trim(),
        apartment: apartment?.trim(),
        city: city?.trim(),
        state: state?.trim(),
        pincode: pincode?.trim(),
        country,
        isDefault
      }
    });

    res.json({ message: 'Address updated successfully', address: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update address' });
  }
};

export const deleteAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const id = String(req.params.id);
    await prisma.address.deleteMany({
      where: { id, userId: req.user.id }
    });

    res.json({ message: 'Address removed successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete address' });
  }
};

// Wishlist
export const getWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const wishlist = await prisma.wishlist.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          include: {
            images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] },
            category: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ wishlist });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
};

export const toggleWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { productId } = req.body;
    if (!productId) {
      res.status(400).json({ message: 'Product ID required' });
      return;
    }

    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId: String(productId)
        }
      }
    });

    if (existing) {
      await prisma.wishlist.delete({ where: { id: existing.id } });
      res.json({ inWishlist: false, message: 'Removed from your wishlist' });
    } else {
      await prisma.wishlist.create({
        data: {
          userId: req.user.id,
          productId: String(productId)
        }
      });
      res.json({ inWishlist: true, message: 'Added to your wishlist' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update wishlist' });
  }
};
