import Service from "../models/Service.js";

const CATEGORY_META_MAP = {
  plumbing: { icon: "plumbing", color: "#2563EB", categoryGroup: "plumbing" },
  electrical: { icon: "electrical-services", color: "#F59E0B", categoryGroup: "electrical" },
  carpentry: { icon: "handyman", color: "#7C3AED", categoryGroup: "carpentry" },
  cleaning: { icon: "cleaning-services", color: "#059669", categoryGroup: "cleaning" },
  painting: { icon: "format-paint", color: "#DC2626", categoryGroup: "painting" },
  roofing: { icon: "home-repair-service", color: "#0891B2", categoryGroup: "roofing" },
  planting: { icon: "local-florist", color: "#15803D", categoryGroup: "planting" },
  "house cleaning": { icon: "cleaning-services", color: "#059669", categoryGroup: "cleaning" },
  "plumbing repair": { icon: "plumbing", color: "#2563EB", categoryGroup: "plumbing" },
};

const getCategoryMeta = (name, category) => {
  const searchKeys = [
    (name || "").toLowerCase(),
    (category || "").toLowerCase(),
  ];
  for (const key of searchKeys) {
    if (CATEGORY_META_MAP[key]) return CATEGORY_META_MAP[key];
  }
  for (const key of Object.keys(CATEGORY_META_MAP)) {
    for (const sk of searchKeys) {
      if (sk && sk.includes(key)) return CATEGORY_META_MAP[key];
    }
  }
  return { icon: "build", color: "#6B7280", categoryGroup: "other" };
};

const checkServiceExists = async (providerId, name, excludeId = null) => {
  const nameLower = name.toLowerCase().trim();
  const query = { providerId, nameLower };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existing = await Service.findOne(query);
  return existing;
};

export const checkServiceAvailability = async (req, res) => {
  try {
    const providerId = req.user?.id || req.body?.providerId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Service name is required",
      });
    }

    const existing = await checkServiceExists(providerId, name, req.params?.excludeId);

    if (existing) {
      return res.json({
        success: true,
        available: false,
        exists: true,
        message: `Service "${existing.name}" already exists in your services list`,
        existingService: {
          id: existing._id,
          name: existing.name,
          category: existing.category,
          basePrice: existing.basePrice,
          isActive: existing.isActive,
        },
      });
    }

    return res.json({
      success: true,
      available: true,
      exists: false,
      message: "Service name is available",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createService = async (req, res) => {
  try {
    const providerId = req.user?.id || req.body?.providerId;
    const providerName = req.user?.name || req.body?.providerName;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required",
      });
    }

    const {
      name,
      description = "",
      category = "home service",
      basePrice = 0,
      priceUnit = "job",
      tags = [],
      images = [],
      source = "manual",
      mlDetected = false,
      mlResult = null,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Service name is required",
      });
    }

    const existing = await checkServiceExists(providerId, name);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Service "${existing.name}" already exists`,
        error: "DUPLICATE_SERVICE",
        existingService: {
          id: existing._id,
          name: existing.name,
          category: existing.category,
          basePrice: existing.basePrice,
        },
      });
    }

    const meta = getCategoryMeta(name, category);
    const categoryGroup = req.body.categoryGroup || meta.categoryGroup;

    const newService = await Service.create({
      providerId,
      providerName: providerName || "Unknown Provider",
      name: name.trim(),
      nameLower: name.toLowerCase().trim(),
      description,
      category,
      categoryGroup,
      basePrice: Number(basePrice) || 0,
      priceUnit,
      tags: Array.isArray(tags) ? tags : [],
      images: Array.isArray(images) ? images : [],
      isActive: true,
      source,
      mlDetected,
      mlResult,
    });

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: newService,
      meta: {
        icon: meta.icon,
        color: meta.color,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Service already exists",
        error: "DUPLICATE_SERVICE",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getServicesByProvider = async (req, res) => {
  try {
    const providerId = req.user?.id || req.query?.providerId;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required",
      });
    }

    const { activeOnly, category } = req.query;
    const query = { providerId };

    if (activeOnly === "true" || activeOnly === true) {
      query.isActive = true;
    }
    if (category) {
      query.category = category;
    }

    const services = await Service.find(query).sort({ createdAt: -1 });

    const servicesWithMeta = services.map((svc) => {
      const meta = getCategoryMeta(svc.name, svc.category);
      return {
        ...svc.toObject(),
        meta: {
          icon: meta.icon,
          color: meta.color,
        },
      };
    });

    res.json({
      success: true,
      count: servicesWithMeta.length,
      data: servicesWithMeta,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const meta = getCategoryMeta(service.name, service.category);

    res.json({
      success: true,
      data: {
        ...service.toObject(),
        meta: {
          icon: meta.icon,
          color: meta.color,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const providerId = req.user?.id || req.body?.providerId;
    const { id } = req.params;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    if (service.providerId !== providerId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own services",
      });
    }

    const {
      name,
      description,
      category,
      categoryGroup,
      basePrice,
      priceUnit,
      tags,
      images,
      isActive,
      source,
    } = req.body;

    if (name !== undefined) {
      const trimmedName = name.trim();
      const existing = await checkServiceExists(providerId, trimmedName, id);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Service "${existing.name}" already exists`,
          error: "DUPLICATE_SERVICE",
          existingService: {
            id: existing._id,
            name: existing.name,
            category: existing.category,
            basePrice: existing.basePrice,
          },
        });
      }
      service.name = trimmedName;
      service.nameLower = trimmedName.toLowerCase();
    }

    if (description !== undefined) service.description = description;
    if (category !== undefined) service.category = category;
    if (categoryGroup !== undefined) {
      service.categoryGroup = categoryGroup;
    } else if (name !== undefined || category !== undefined) {
      const meta = getCategoryMeta(service.name, service.category);
      service.categoryGroup = meta.categoryGroup;
    }
    if (basePrice !== undefined) service.basePrice = Number(basePrice) || 0;
    if (priceUnit !== undefined) service.priceUnit = priceUnit;
    if (tags !== undefined) service.tags = Array.isArray(tags) ? tags : [];
    if (images !== undefined) service.images = Array.isArray(images) ? images : [];
    if (isActive !== undefined) service.isActive = isActive;
    if (source !== undefined) service.source = source;

    await service.save();

    const meta = getCategoryMeta(service.name, service.category);

    res.json({
      success: true,
      message: "Service updated successfully",
      data: {
        ...service.toObject(),
        meta: {
          icon: meta.icon,
          color: meta.color,
        },
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Service already exists",
        error: "DUPLICATE_SERVICE",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    const providerId = req.user?.id;
    const { id } = req.params;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    if (service.providerId !== providerId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own services",
      });
    }

    await Service.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const toggleServiceActive = async (req, res) => {
  try {
    const providerId = req.user?.id;
    const { id } = req.params;

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    if (service.providerId !== providerId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    service.isActive = !service.isActive;
    await service.save();

    res.json({
      success: true,
      message: `Service ${service.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        id: service._id,
        isActive: service.isActive,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getServiceCategoryMeta = async (req, res) => {
  try {
    const { name, category } = req.query;
    const meta = getCategoryMeta(name, category);

    res.json({
      success: true,
      data: meta,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
