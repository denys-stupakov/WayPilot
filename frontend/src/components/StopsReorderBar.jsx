import { DndContext } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { SortableItem } from "./SortableItem";
import { Navigation, Trash2, GripHorizontal, Plus } from "lucide-react";

function StopsReorderBar({
  stops,
  setStops,
  deleteStop,
  setAddStopId,
  handleDragEnd
}) {
  if (stops.length === 0) return null;

  const updateStopName = (id, newName) => {
    setStops(prev => prev.map(stop => 
      stop.id === id ? { ...stop, name: newName } : stop
    ));
  };

  return (
    <div
      className="fixed bottom-6 left-6 z-[1000] flex flex-col gap-2 p-4 h-100 w-60 overflow-y-auto overflow-x-hidden rounded-2xl"
      style={{
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.4), rgba(255,255,255,0.25))",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.45)",
        boxShadow:
          "inset 0 0 1px rgba(255,255,255,0.5), 0 8px 30px rgba(0,0,0,0.2)",
      }}
    >
      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext
          items={stops.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="header">
            <h1>Trasa</h1>
          </div>

          <div className="flex flex-col gap-6">
            {stops.map((stop) => (
              <SortableItem
                key={stop.id}
                id={stop.id}
                className="flex items-center justify-between"
              >
                {({ listeners }) => (
                  <>
                    <div className="text-white bg-blue-500 rounded-3xl p-2 flex items-center justify-center">
                      <Navigation size={20} />
                    </div>

                    <div className="flex flex-col items-start flex-1 px-2">
                      <div className="text-xs text-gray-600">
                        {stops.findIndex((s) => s.id === stop.id) + 1}
                      </div>
                      <input
                        type="text"
                        value={stop.name || ""}
                        onChange={(e) => updateStopName(stop.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm text-gray-900 bg-white bg-opacity-70 rounded px-1 py-0.5 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="Názov zastávky"
                      />
                    </div>

                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          deleteStop(stop.id);
                        }}
                        className="cursor-pointer p-1 text-red-500"
                      >
                        <Trash2 size={20} />
                      </button>

                      <div className="cursor-grab active:cursor-grabbing">
                        <GripHorizontal {...listeners} size={20} />
                      </div>
                    </div>
                  </>
                )}
              </SortableItem>
            ))}

            <div className="flex items-center gap-3">
              <button
                className="text-white bg-gray-500 cursor-pointer rounded-3xl p-2 flex items-center justify-center"
                onClick={() => setAddStopId(true)}
              >
                <Plus size={20} />
              </button>
              <h1>Pridať zastávku</h1>
            </div>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default StopsReorderBar;