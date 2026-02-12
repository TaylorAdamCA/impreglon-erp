"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerForm } from "./customer-form";
import { ContactDialog } from "./contact-dialog";
import { ShipToDialog } from "./ship-to-dialog";
import { CarrierDialog } from "./carrier-dialog";

interface Contact {
  id: string;
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  department: string | null;
  isPrimary: boolean;
}

interface ShipTo {
  id: string;
  name: string;
  address1: string;
  address2: string | null;
  city: string;
  province: string | null;
  postalCode: string | null;
  isDefault: boolean;
}

interface Carrier {
  id: string;
  name: string;
  account: string | null;
  phone: string | null;
  isDefault: boolean;
}

interface CustomerData {
  id: string;
  custNo: number;
  company: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  terms: string | null;
  notes: string | null;
  isActive: boolean;
  contacts: Contact[];
  shipToAddresses: ShipTo[];
  carriers: Carrier[];
}

interface CustomerDetailTabsProps {
  customer: CustomerData;
}

export function CustomerDetailTabs({ customer }: CustomerDetailTabsProps) {
  const router = useRouter();

  // Contact dialog state
  const [contactOpen, setContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();

  // Ship-to dialog state
  const [shipToOpen, setShipToOpen] = useState(false);
  const [editingShipTo, setEditingShipTo] = useState<ShipTo | undefined>();

  // Carrier dialog state
  const [carrierOpen, setCarrierOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | undefined>();

  async function handleDelete(type: string, entityId: string) {
    if (!confirm("Are you sure you want to delete this?")) return;

    const res = await fetch(
      `/api/customers/${customer.id}/${type}/${entityId}`,
      { method: "DELETE" }
    );

    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <>
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts ({customer.contacts.length})
          </TabsTrigger>
          <TabsTrigger value="ship-to">
            Ship-To ({customer.shipToAddresses.length})
          </TabsTrigger>
          <TabsTrigger value="carriers">
            Carriers ({customer.carriers.length})
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl">
                <CustomerForm
                  customerId={customer.id}
                  defaultValues={{
                    company: customer.company,
                    address1: customer.address1 ?? "",
                    address2: customer.address2 ?? "",
                    city: customer.city ?? "",
                    province: customer.province ?? "",
                    postalCode: customer.postalCode ?? "",
                    phone: customer.phone ?? "",
                    fax: customer.fax ?? "",
                    email: customer.email ?? "",
                    terms: customer.terms ?? "",
                    notes: customer.notes ?? "",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contacts</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingContact(undefined);
                  setContactOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </CardHeader>
            <CardContent>
              {customer.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contacts yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.name}
                          {contact.isPrimary && (
                            <Star className="ml-1 inline h-3 w-3 text-yellow-500 fill-yellow-500" />
                          )}
                        </TableCell>
                        <TableCell>{contact.title}</TableCell>
                        <TableCell>{contact.phone}</TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.department}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingContact(contact);
                                setContactOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() =>
                                handleDelete("contacts", contact.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ship-To Tab */}
        <TabsContent value="ship-to" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ship-To Addresses</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingShipTo(undefined);
                  setShipToOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Address
              </Button>
            </CardHeader>
            <CardContent>
              {customer.shipToAddresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No ship-to addresses yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Province</TableHead>
                      <TableHead>Postal Code</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.shipToAddresses.map((addr) => (
                      <TableRow key={addr.id}>
                        <TableCell className="font-medium">
                          {addr.name}
                          {addr.isDefault && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Default
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {addr.address1}
                          {addr.address2 && `, ${addr.address2}`}
                        </TableCell>
                        <TableCell>{addr.city}</TableCell>
                        <TableCell>{addr.province}</TableCell>
                        <TableCell>{addr.postalCode}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingShipTo(addr);
                                setShipToOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() =>
                                handleDelete("ship-to", addr.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Carriers Tab */}
        <TabsContent value="carriers" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Carriers</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingCarrier(undefined);
                  setCarrierOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Carrier
              </Button>
            </CardHeader>
            <CardContent>
              {customer.carriers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No carriers yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Account #</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.carriers.map((carrier) => (
                      <TableRow key={carrier.id}>
                        <TableCell className="font-medium">
                          {carrier.name}
                          {carrier.isDefault && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Default
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{carrier.account}</TableCell>
                        <TableCell>{carrier.phone}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingCarrier(carrier);
                                setCarrierOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() =>
                                handleDelete("carriers", carrier.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ContactDialog
        customerId={customer.id}
        contact={editingContact}
        open={contactOpen}
        onOpenChange={(open) => {
          setContactOpen(open);
          if (!open) setEditingContact(undefined);
        }}
      />

      <ShipToDialog
        customerId={customer.id}
        address={editingShipTo}
        open={shipToOpen}
        onOpenChange={(open) => {
          setShipToOpen(open);
          if (!open) setEditingShipTo(undefined);
        }}
      />

      <CarrierDialog
        customerId={customer.id}
        carrier={editingCarrier}
        open={carrierOpen}
        onOpenChange={(open) => {
          setCarrierOpen(open);
          if (!open) setEditingCarrier(undefined);
        }}
      />
    </>
  );
}
