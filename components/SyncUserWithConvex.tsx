"use client"

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function SyncUserWithConvex(){

    const {user} = useUser();

    const updateUser = useMutation(api.users.updateUser)

    useEffect(() => {
        if (!user) return;
        

        const syncUser = async () => {
        try {
            await updateUser({
            userId: user.id,
            name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
            email: user.emailAddresses[0]?.emailAddress ?? "",
            address: user.unsafeMetadata.address as string,
            phoneOne: user.unsafeMetadata.phoneNumber1 as string,
            phoneTwo: user.unsafeMetadata.phoneNumber2 as string,
            });
        } catch (error) {
            console.error("Error syncing user:", error);
        }
        };

        syncUser();
    }, [user, updateUser]);

    return null;
}

export default SyncUserWithConvex;