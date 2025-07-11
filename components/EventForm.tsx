"use client";

import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStorageUrl } from "@/lib/utils";
import { Checkbox } from "./ui/checkbox";
import { CURRENCY } from "@/convex/constants";

const formSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"),
  eventDate: z
    .date()
    .min(
      new Date(new Date().setHours(0, 0, 0, 0)),
      "Event date must be in the future"
    ),
  t1_name: z.string().min(1 , "Tier 1 name is required"),
  t2_name: z.string().min(1, "Tier 2 name is required"),
  t3_name: z.string().min(1, "Tier 3 name is required"),
  silver_price: z.number().min(0, "Price must be 0 or greater"),
  gold_price: z.number().min(0, "Price must be 0 or greater"),
  platinum_price: z.number().min(0, "Price must be 0 or greater"),
  totalSilverTickets: z.number().min(0, "Must have at least 1 ticket"),
  totalGoldTickets: z.number().min(0, "Must have at least 1 ticket"),
  totalPlatinumTickets: z.number().min(0, "Must have at least 1 ticket"),
});

type FormData = z.infer<typeof formSchema>;

interface InitialEventData {
  _id: Id<"events">;
  name: string;
  description: string;
  location: string;
  eventDate: number;
  t1_name: string;
  t2_name: string;
  t3_name: string;
  silver_price: number;
  totalSilverTickets: number;
  gold_price: number;
  totalGoldTickets: number;
  platinum_price: number;
  totalPlatinumTickets: number;
  imageStorageId?: Id<"_storage">;
}

interface EventFormProps {
  mode: "create" | "edit";
  initialData?: InitialEventData;
}

export default function EventForm({ mode, initialData }: EventFormProps) {
  const { user } = useUser();
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.updateEvent);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const currentImageUrl = useStorageUrl(initialData?.imageStorageId);

  // Image upload
  const imageInput = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const updateEventImage = useMutation(api.storage.updateEventImage);
  const deleteImage = useMutation(api.storage.deleteImage);

  const [removedCurrentImage, setRemovedCurrentImage] = useState(false);
  const [goldChecked, setGoldChecked] = useState(false);
  const [platinumChecked, setPlatinumChecked] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      location: initialData?.location ?? "",
      eventDate: initialData ? new Date(initialData.eventDate) : new Date(),
      t1_name: initialData?.t1_name ?? "silver",
      t2_name: (initialData?.t2_name == "" || !initialData?.t2_name) ? "gold" : initialData?.t2_name,
      t3_name: (initialData?.t3_name == "" || !initialData?.t3_name) ? "platinum" : initialData?.t3_name,
      silver_price: initialData?.silver_price ?? 0,
      gold_price: initialData?.gold_price ?? 0,
      platinum_price: initialData?.platinum_price ?? 0,
      totalSilverTickets: initialData?.totalSilverTickets ?? 1,
      totalGoldTickets: initialData?.totalGoldTickets ?? 1,
      totalPlatinumTickets: initialData?.totalPlatinumTickets ?? 1,
    }
  });

  

  useEffect(() => {
    if(initialData){
      setGoldChecked(initialData?.totalGoldTickets > 0);
      setPlatinumChecked(initialData?.totalPlatinumTickets > 0);
    }
    // return () => clearInterval(interval);
  }, []);

  async function onSubmit(values: FormData) {
    if(!goldChecked){values.gold_price = 0; values.totalGoldTickets = 0; values.t2_name = ""}
    if(!platinumChecked){values.platinum_price = 0; values.totalPlatinumTickets = 0; values.t3_name = ""}
    
    if (!user?.id) return;

    startTransition(async () => {
      try {
        let imageStorageId = null;

        // Handle image changes
        if (selectedImage) {
          // Upload new image
          imageStorageId = await handleImageUpload(selectedImage);
        }

        // Handle image deletion/update in edit mode
        if (mode === "edit" && initialData?.imageStorageId) {
          if (removedCurrentImage || selectedImage) {
            // Delete old image from storage
            await deleteImage({
              storageId: initialData.imageStorageId,
            });
          }
        }

        if (mode === "create") {
          const eventId = await createEvent({
            ...values,
            userId: user.id,
            eventDate: values.eventDate.getTime(),
          });

          if (imageStorageId) {
            await updateEventImage({
              eventId,
              storageId: imageStorageId as Id<"_storage">,
            });
          }

          router.push(`/event/${eventId}`);
        } else {
          // Ensure initialData exists before proceeding with update
          if (!initialData) {
            throw new Error("Initial event data is required for updates");
          }

          // check
          if(initialData.totalSilverTickets > values.totalSilverTickets || 
             initialData.totalGoldTickets > values.totalGoldTickets ||
             initialData.totalPlatinumTickets > values.totalPlatinumTickets)
          {
            toast.warning( "You can only increase the total number of tickets." );
            return;
          }

          // Update event details
          await updateEvent({
            eventId: initialData._id,
            ...values,
            eventDate: values.eventDate.getTime(),
          });

          // Update image - this will now handle both adding new image and removing existing image
          if (imageStorageId || removedCurrentImage) {
            await updateEventImage({
              eventId: initialData._id,
              // If we have a new image, use its ID, otherwise if we're removing the image, pass null
              storageId: imageStorageId
                ? (imageStorageId as Id<"_storage">)
                : null,
            });
          }

          toast.success( "Your event has been successfully updated." );

          router.push(`/event/${initialData._id}`);
        }
      } catch (error) {
        console.error("Failed to handle event:", error);
        toast.error( "Uh oh! Something went wrong." ,{
            description: "There was a problem with your request.",
        });
      }
    });

    console.log(values);
    
  }

  async function handleImageUpload(file: File): Promise<string | null> {
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      return storageId;
    } catch (error) {
      console.error("Failed to upload image:", error);
      return null;
    }
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Form fields */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    onChange={(e) => {
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : null
                      );
                    }}
                    value={
                      field.value
                        ? new Date(field.value).toISOString().split("T")[0]
                        : ""
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          
          <hr />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          <input checked disabled type="checkbox" className="w-5 h-5"/>
            {/* <p className="font-bold">Silver Tier</p> */}
            {/* ////////////////////////////////////////////////////// */}
            <FormField
              control={form.control}
              name="t1_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Tier 1 name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="text"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* ////////////////////////////////////////////////////// */}

            <FormField
              control={form.control}
              name="silver_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Price per Ticket</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2">
                        {CURRENCY}
                      </span>
                      <Input
                        min={0}
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalSilverTickets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Total Tickets Available</FormLabel>
                  <FormControl>
                    <Input
                      min={1}
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <hr />

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center ${goldChecked ? "" : "line-through text-red-500"}`}>
            
            <input disabled={(initialData && initialData?.totalGoldTickets > 1 ? true : false)} checked={goldChecked} type="checkbox" className="w-5 h-5" onChange={(e)=>{ 
              setGoldChecked((e.target as HTMLInputElement).checked);
            }}/>

            {/* <p className="font-bold">Gold Tier</p> */}
            {/* ////////////////////////////////////////////////////// */}
            <FormField
              disabled={goldChecked ? false : true}
              control={form.control}
              name="t2_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Tier 2 name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="text"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* ////////////////////////////////////////////////////// */}

            <FormField
              disabled={goldChecked ? false : true}
              control={form.control}
              name="gold_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Price per Ticket</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2">
                        {CURRENCY}
                      </span>
                      <Input
                        min={0}
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              disabled={goldChecked ? false : true}
              control={form.control}
              name="totalGoldTickets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-normal">Total Tickets Available</FormLabel>
                  <FormControl>
                    <Input
                      min={1}
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <hr />

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center ${platinumChecked ? "" : "line-through text-red-500"}`}>
            
              <input disabled={(initialData && initialData?.totalPlatinumTickets > 1 ? true : false)} checked={platinumChecked} type="checkbox" className="w-5 h-5" onChange={(e)=>{ 
                setPlatinumChecked((e.target as HTMLInputElement).checked);
              }}/>  

              {/* <p className="font-bold">Platinum Tier</p> */}
              {/* ////////////////////////////////////////////////////// */}
              <FormField
                disabled={platinumChecked ? false : true}
                control={form.control}
                name="t3_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-normal">Tier 3 name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="text"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* ////////////////////////////////////////////////////// */}
  
              <FormField
                control={form.control}
                name="platinum_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-normal">Price per Ticket</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2">
                          {CURRENCY}
                        </span>
                        <Input
                          disabled={platinumChecked ? false : true}
                          min={0}
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className="pl-10"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
  
              <FormField
                control={form.control}
                name="totalPlatinumTickets"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-normal">Total Tickets Available</FormLabel>
                    <FormControl>
                      <Input
                        disabled={platinumChecked ? false : true}
                        min={1}
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <hr/>

          {/* Image Upload */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Event Image
            </label>
            <div className="mt-1 flex items-center gap-4">
              {imagePreview || (!removedCurrentImage && currentImageUrl) ? (
                <div className="relative w-32 aspect-square bg-gray-100 rounded-lg">
                  <Image
                    src={imagePreview || currentImageUrl!}
                    alt="Preview"
                    fill
                    className="object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                      setRemovedCurrentImage(true);
                      if (imageInput.current) {
                        imageInput.current.value = "";
                      }
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={imageInput}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              )}
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {mode === "create" ? "Creating Event..." : "Updating Event..."}
            </>
          ) : mode === "create" ? (
            "Create Event"
          ) : (
            "Update Event"
          )}
        </Button>
      </form>
    </Form>
  );
}