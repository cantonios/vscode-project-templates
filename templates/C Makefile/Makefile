# compilers and flags
CC        := gcc
C_FLAGS   := -Wall -pedantic -Wextra -std=c11 -g -O0

LD        := gcc
LD_FLAGS  := 

# folder structure
BIN       := bin
SRC       := src
INCLUDE   := include
BUILD     := build

# update flags
C_FLAGS  := $(C_FLAGS) -I$(INCLUDE)

# program outputs
LIBRARIES   :=
EXECUTABLE  := main

# C sources and dependences
C_SOURCES   := $(wildcard $(SRC)/*.c) 
C_DEPENDS   := $(patsubst $(SRC)/%.c, $(BUILD)/%.c.d, $(C_SOURCES))
C_OBJECTS   := $(patsubst $(SRC)/%.c, $(BUILD)/%.c.o, $(C_SOURCES))

# platform-specific commands and settings
ifeq ($(OS),Windows_NT)
	RM_CALL     = del /Q /F $(subst /,\,$(1)) 2>NUL
	MKDIR_CALL  = if not exist "$(subst /,\,$(1))" mkdir "$(subst /,\,$(1))"
	FIND_CALL   = dir /b/s "$(subst /,\,$(1))"
	PATH_CALL   = $(subst /,\,$(1))
else
	RM_CALL     = rm -rf $(1)
	MKDIR_CALL  = mkdir -p $(1)
	FIND_CALL   = find -L . -name $(1)
	PATH_CALL   = $(1)
endif

# targets
TARGET := $(BIN)/$(EXECUTABLE)

all:  $(TARGET)

deps: $(C_DEPENDS)

rebuild: clean all

run: all
	$(call PATH_CALL,$(TARGET))

clean:
	$(call RM_CALL,$(TARGET) $(C_DEPENDS) $(C_OBJECTS) )

# include dependency rules
-include $(C_DEPENDS)

# build and bin directories
$(BUILD):
	$(call MKDIR_CALL,$@)

$(BIN):
	$(call MKDIR_CALL,$@)

# dependencies
$(BUILD)/%.c.d: $(SRC)/%.c | $(BUILD)
	$(CC) $(C_FLAGS) -MM -MT $(@:.d=.o) $< >> $@

# objects
$(BUILD)/%.c.o: $(SRC)/%.c | $(BUILD)
	$(CC) $(C_FLAGS) -o $@ -c $<

# binary
$(BIN)/$(EXECUTABLE): $(C_OBJECTS) | $(BIN)
	$(LD) $(LD_FLAGS) $(C_OBJECTS) -o $@ $(LIBRARIES)

