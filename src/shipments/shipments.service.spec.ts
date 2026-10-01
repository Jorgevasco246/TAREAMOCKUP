import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, jest, beforeEach, it, expect } from "@jest/globals";
import { ShipmentsService } from "./shipments.service";
import { ShipmentEntity } from "./entities/shipment.entity";
import { ShipmentRulesService } from "./shipment-rules.service";
import { ShipmentStatus } from "./shipment-status.enum";

void describe("ShipmentsServiceTest", () => {
  let service: ShipmentsService;

  const repositoryMock = {
    find: jest.fn<() => Promise<ShipmentEntity[]>>(),
    findOneBy: jest.fn<(options: any) => Promise<ShipmentEntity | null>>(),
    create: jest.fn<(data: any) => ShipmentEntity>(),
    save: jest.fn<(entity: any) => Promise<ShipmentEntity>>(), 
  };
//Porque se necesita toda esa funcion a la hora de decir que funciones vamos a usar
  const shipmentRulesServiceMock = {
    ensureCanBeDispatched: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        {
          provide: getRepositoryToken(ShipmentEntity),
          useValue: repositoryMock,
        },
        {
          provide: ShipmentRulesService,
          useValue: shipmentRulesServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get(ShipmentsService);
  });
//Estudiar esta parte
//Caso 1
  it("is defined", () => {
    expect(service).toBeDefined();
  });

//Caso 2

  it("returns all shipments", async () => {
    // Arrange
    const mockShipments = [
      { id: 1, trackingCode: "SHIP-1", destination: "Cali", status: ShipmentStatus.CREATED },
      { id: 2, trackingCode: "SHIP-2", destination: "Bogotá", status: ShipmentStatus.DISPATCHED },
    ] as ShipmentEntity[];

    repositoryMock.find.mockResolvedValue(mockShipments);

    // Act
    const result = await service.findAll();

    // Assert
    expect(result).toEqual(mockShipments);
    expect(repositoryMock.find).toHaveBeenCalledTimes(1);
  });

//caso 3

  it("returns a shipment when the id exists", async () => {
    // Arrange
    const mockShipment = {
      id: 7,
      trackingCode: "SHIP-7",
      destination: "Medellín",
      status: ShipmentStatus.CREATED,
    } as ShipmentEntity;

    repositoryMock.findOneBy.mockResolvedValue(mockShipment);

    // Act
    const result = await service.findOne(7);

    // Assert
    expect(result).toEqual(mockShipment);
    expect(repositoryMock.findOneBy).toHaveBeenCalledWith({ id: 7 });
  });

//Caso 4

  it("throws NotFoundException when the id does not exist", async () => {
    // Arrange
    repositoryMock.findOneBy.mockResolvedValue(null);

    // Act & Assert
    await expect(service.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
    expect(repositoryMock.findOneBy).toHaveBeenCalledWith({ id: 999 });
  });

  it("creates and saves a shipment", async () => {
    // Arrange
    const createDto = {
      trackingCode: "SHIP-100",
      destination: "Cali",
    };

    const createdEntity = {
      ...createDto,
      status: ShipmentStatus.CREATED,
    } as ShipmentEntity;

    const savedEntity = {
      ...createdEntity,
      id: 1,
    } as ShipmentEntity;

    repositoryMock.create.mockReturnValue(createdEntity);
    repositoryMock.save.mockResolvedValue(savedEntity);

    // Act
    const result = await service.create(createDto);

    // Assert
    expect(repositoryMock.create).toHaveBeenCalledWith({
      ...createDto,
      status: ShipmentStatus.CREATED,
    });
    expect(repositoryMock.save).toHaveBeenCalledWith(createdEntity);
    expect(result).toEqual(savedEntity);
  });

//Caso 5    

  it("dispatches and saves a valid shipment", async () => {
    // Arrange
    const mockShipment = {
      id: 5,
      trackingCode: "SHIP-5",
      destination: "Barranquilla",
      status: ShipmentStatus.CREATED,
    } as ShipmentEntity;

    const updatedShipment = {
      ...mockShipment,
      status: ShipmentStatus.DISPATCHED,
    } as ShipmentEntity;

    repositoryMock.findOneBy.mockResolvedValue(mockShipment);
    repositoryMock.save.mockResolvedValue(updatedShipment);

    // Act
    const result = await service.dispatch(5);

    // Assert
    expect(shipmentRulesServiceMock.ensureCanBeDispatched).toHaveBeenCalledWith(mockShipment);
    expect(mockShipment.status).toBe(ShipmentStatus.DISPATCHED);
    expect(repositoryMock.save).toHaveBeenCalledWith(mockShipment);
    expect(result).toEqual(updatedShipment);
  });
});